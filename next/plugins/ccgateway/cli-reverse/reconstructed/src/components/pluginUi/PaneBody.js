/**
 * components/pluginUi/PaneBody.tsx
 *
 * 2.1.316 新增。插件面板内容区。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (21)
 * attribution: placement 19, layout 2
 */
import {
  init_react_production,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { rootSessionSlot } from "../../context/replRootContext.js";
import { getIsRemoteMode } from "../../bootstrap/state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { topWithin } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SiteColumns, SiteRows } from "./render/elements.js";
import { useWheelScrollStep } from "../ScrollKeybindingHandler.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { logRejection } from "../../plugins/functionHooks/uiApi.js";
import { dispatchUiScroll, siteKey, scrollSites } from "../../plugins/functionHooks/uiHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:488872-488876 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:488872", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:500106-500110 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:500106", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:500110-500114 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:500110", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:500114-500178 layout
function canShowCloseSessionConfirm(statusLineSuppressed) {
  let hasRootSession = useContext(rootSessionSlot) !== null;
  return statusLineSuppressed && !getIsRemoteMode() && (hasRootSession || isBgSession());
}
//@ chunk-czq1j3j2.js:500178-500235 layout
function hasPaneContext(activeContexts) {
  return activeContexts.has("Pane") || activeContexts.has("PaneField");
}
//@ chunk-czq1j3j2.js:500235-500239 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:500235", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:502376-502386 placement
var BORDER_COLUMNS = 4;
//@ chunk-czq1j3j2.js:502386-502420 placement
var chromeRows = (hasHeader, hasFooter) => (hasHeader || !hasFooter ? 1 : 0) + (hasFooter ? 2 : 0);
//@ chunk-czq1j3j2.js:502420-502429 placement
var BORDER_MARK_INSET = 2;
//@ chunk-czq1j3j2.js:502429-502433 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:502429", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:504351-504491 placement
var toLocalPoint = (elementRef) => (point) => {
  let cachedLayout = elementRef.current?.cachedLayout;
  return point.col !== undefined && point.row !== undefined && cachedLayout !== undefined
    ? {
        column: point.col - cachedLayout.x,
        row: point.row - cachedLayout.y,
      }
    : undefined;
};
//@ chunk-czq1j3j2.js:504491-504698 placement
function heldRowOffset(heldState, edge) {
  let { held, index, content } = heldState;
  if (held === null || index === null || held.index !== index || content === null) return -1;
  let heldTop = topWithin(held.node, content);
  let heldHeight = held.node.yogaNode?.getComputedHeight() ?? 0;
  return heldTop < 0 ? -1 : heldTop + (edge === "bottom" ? heldHeight : 0);
}
//@ chunk-czq1j3j2.js:504698-505070 placement
/**
 * 在节点树中按 elementKey/插件查找元素上下边界。
 */
function findElementBounds(root, elementKey, plugin) {
  let stack = [root];
  for (let node = stack.pop(); node; node = stack.pop()) {
    let { elementKey: elementKey_2, elementPlugin } = node.attributes;
    if (
      node !== root &&
      elementKey_2 === elementKey &&
      (elementPlugin === undefined || elementPlugin === plugin)
    ) {
      let top = topWithin(node, root);
      let height = node.yogaNode?.getComputedHeight() ?? 0;
      return top < 0
        ? undefined
        : {
            top,
            bottom: top + height,
          };
    }
    for (let childIndex = node.childNodes.length - 1; childIndex >= 0; childIndex -= 1) {
      let child = node.childNodes[childIndex];
      if (child && child.nodeName !== "#text") stack.push(child);
    }
  }
  return;
}
//@ chunk-czq1j3j2.js:505070-505283 placement
function paneScrollHandlers(scroll) {
  let { bodyRows, contentRows, scrollBy } = scroll;
  return {
    "pane:scrollUp": () => scrollBy(-1),
    "pane:scrollDown": () => scrollBy(1),
    "pane:pageUp": () => scrollBy(-bodyRows),
    "pane:pageDown": () => scrollBy(bodyRows),
    "pane:top": () => scrollBy(-contentRows),
    "pane:bottom": () => scrollBy(contentRows),
  };
}
//@ chunk-czq1j3j2.js:505283-505395 placement
var wheelScrollHandler = (scrollState, deltaForDirection, resolvePoint) => (event) => {
  let direction = event.deltaY < 0 ? -1 : 1;
  scrollState.scrollBy(direction * deltaForDirection(direction), resolvePoint(event));
  event.preventDefault();
  event.stopPropagation();
};
//@ chunk-czq1j3j2.js:505395-505596 placement
var PaneContent = (props) =>
  jsxProd_default(Box, {
    ref: props.content,
    marginTop: -props.offset,
    flexDirection: "column",
    flexShrink: 0,
    marginRight: props.keptColumns,
    children: jsxProd_default(SiteColumns, {
      value: props.columns,
      children: jsxProd_default(SiteRows, {
        value: props.rows,
        children: props.children,
      }),
    }),
  });
//@ chunk-czq1j3j2.js:505596-505675 placement
function wheelScrollRows(scrollState, resolvePoint) {
  let wheelScrollStep = useWheelScrollStep();
  return wheelScrollHandler(
    scrollState,
    (direction) => wheelScrollStep(direction, performance.now()).rows,
    resolvePoint,
  );
}
//@ chunk-czq1j3j2.js:505675-505704 placement
var mergeShallow = (a, b) => ({
  ...a,
  ...b,
});
//@ chunk-czq1j3j2.js:505708-505746 placement
var floorClampZero = (value) => Math.max(0, Math.floor(value));
//@ chunk-czq1j3j2.js:505746-507739 placement
function PaneBody(props) {
  let { component, requestId, owner, content } = props;
  let { bodyRows, contentRows, maxOffset } = props;
  let [offset, setOffset, getOffset] = useLatestState(0);
  let [isFollowing, setFollowing, getFollowing] = useLatestState(false);
  let [raised, bumpRaised] = useReducer((prev) => prev + 1, 0);
  let propsRef = useRef({
    bodyRows,
    contentRows,
    maxOffset,
  });
  let isScrollingRef = useRef(false);
  let lastScrollRef = useRef(undefined);
  let programmaticRef = useRef(false);
  let pendingDelta = useRef(0);
  let pendingPointer = useRef(undefined);
  let isMounted = useRef(true);
  let currentMaxOffset = useCallback(
    () => (getFollowing() ? propsRef.current.maxOffset : Math.min(getOffset(), propsRef.current.maxOffset)),
    [getOffset, getFollowing],
  );
  let commitOffset = useCallback(
    (nextOffset) => {
      let clamped = floorClampZero(nextOffset);
      if (clamped !== currentMaxOffset()) {
        programmaticRef.current = isScrollingRef.current;
        pendingDelta.current = 0;
        pendingPointer.current = undefined;
      }
      setFollowing(false);
      setOffset(clamped);
    },
    [setOffset, setFollowing, currentMaxOffset],
  );
  let commitFromScroll = useCallback(
    (nextOffset, kind) => {
      if (kind.kind === "plugin") {
        commitOffset(nextOffset);
        return true;
      }
      if (programmaticRef.current) return false;
      let clamped = floorClampZero(nextOffset);
      let lastScroll = lastScrollRef.current;
      if (
        !(getFollowing() && lastScroll !== undefined && lastScroll.by > 0 && clamped === lastScroll.offset) &&
        clamped !== currentMaxOffset()
      ) {
        setFollowing(false);
        setOffset(clamped);
      }
      return true;
    },
    [setOffset, setFollowing, commitOffset, currentMaxOffset, getFollowing],
  );
  let runGuard = useCallback(
    (fn) => {
      let before = currentMaxOffset();
      let result = fn();
      if (currentMaxOffset() !== before) bumpRaised();
      return result;
    },
    [currentMaxOffset],
  );
  let scrollByImpl = useCallback(
    (delta, pointer) => {
      let propsSnapshot = propsRef.current;
      let offset = Math.min(propsSnapshot.maxOffset, floorClampZero(currentMaxOffset() + delta));
      isScrollingRef.current = true;
      lastScrollRef.current = {
        by: delta,
        offset,
      };
      programmaticRef.current = false;
      logRejection(
        `ui.scroll ${component} ${requestId}`,
        dispatchUiScroll({
          input: {
            component,
            requestId,
            offset,
            by: delta,
            bodyRows: propsSnapshot.bodyRows,
            contentRows: propsSnapshot.contentRows,
            origin: {
              kind: "person",
            },
            ...(pointer !== undefined && {
              pointer,
            }),
          },
        }),
      ).finally(() => {
        isScrollingRef.current = false;
        lastScrollRef.current = undefined;
        let flushedDelta = pendingDelta.current;
        let flushedPointer = pendingPointer.current;
        pendingDelta.current = 0;
        pendingPointer.current = undefined;
        if (isMounted.current && flushedDelta !== 0) scrollByImpl(flushedDelta, flushedPointer);
      });
    },
    [component, requestId, currentMaxOffset],
  );
  let place = useCallback((fn) => commitOffset(fn(getOffset())), [commitOffset, getOffset]);
  function scrollBy(delta, pointer) {
    if (delta === 0) return;
    if (isScrollingRef.current) {
      pendingDelta.current += delta;
      pendingPointer.current = pointer;
      return;
    }
    scrollByImpl(delta, pointer);
  }
  useLayoutEffect(() => {
    propsRef.current = {
      bodyRows,
      contentRows,
      maxOffset,
    };
  }, [bodyRows, contentRows, maxOffset]);
  useLayoutEffect(() => {
    if (isFollowing && getOffset() !== maxOffset) setOffset(maxOffset);
  }, [isFollowing, maxOffset, getOffset, setOffset]);
  useEffect(() => {
    let siteName = siteKey(component, requestId);
    scrollSites().set(siteName, {
      component,
      requestId,
      owner,
      bodyRows,
      contentRows,
      maxOffset,
      offset: () => (getFollowing() ? maxOffset : Math.min(getOffset(), maxOffset)),
      keyRows: (element, focusKey) => {
        let contentNode = content.current;
        return contentNode ? findElementBounds(contentNode, focusKey, element) : undefined;
      },
      commit: (offset, kind) => runGuard(() => commitFromScroll(Math.min(maxOffset, offset), kind)),
      followEnd: () => runGuard(() => setFollowing(true)),
    });
    return () => {
      scrollSites().delete(siteName);
    };
  }, [
    component,
    requestId,
    owner,
    bodyRows,
    contentRows,
    maxOffset,
    content,
    commitFromScroll,
    runGuard,
    getOffset,
    getFollowing,
    setFollowing,
  ]);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );
  return mergeShallow(
    {
      offset: isFollowing ? maxOffset : Math.min(offset, maxOffset),
      bodyRows,
      contentRows,
      maxOffset,
      scrollBy,
    },
    {
      placed: isFollowing ? maxOffset : offset,
      place,
      raised,
    },
  );
}
//@ chunk-czq1j3j2.js:507743-507870 placement
function withScrollOffset(renderInput, scroll) {
  let { offset, raised } = scroll;
  return useMemo(
    () => ({
      ...renderInput,
      props: {
        ...renderInput.props,
        scroll: {
          ...renderInput.props.scroll,
          offset,
        },
      },
    }),
    [renderInput, raised],
  );
}
export {
  BORDER_COLUMNS,
  BORDER_MARK_INSET,
  chromeRows,
  paneScrollHandlers,
  PaneBody,
  wheelScrollRows,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
  canShowCloseSessionConfirm,
  hasPaneContext,
};
