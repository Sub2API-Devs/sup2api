/**
 * components/pluginUi/PaneBody.tsx
 *
 * 2.1.316 新增。插件面板内容区。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: placement 19
 */
import {
  init_react_production,
  useReducer,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { topWithin } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SiteColumns, SiteRows } from "./render/elements.js";
import { useWheelScrollStep } from "../ScrollKeybindingHandler.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { logRejection } from "../../plugins/functionHooks/uiApi.js";
import { dispatchUiScroll, siteKey, scrollSites } from "../../plugins/functionHooks/uiHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:475900-475910 placement
var BORDER_COLUMNS = 4;
//@ chunk-18hwfzwa.js:475910-475944 placement
var chromeRows = (hasHeader, hasFooter) => (hasHeader || !hasFooter ? 1 : 0) + (hasFooter ? 2 : 0);
//@ chunk-18hwfzwa.js:475944-475953 placement
var BORDER_MARK_INSET = 2;
//@ chunk-18hwfzwa.js:475953-475957 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:475953", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:475957-475961 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:475957", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:477875-478015 placement
var toLocalPoint = (elementRef) => (point) => {
  let cachedLayout = elementRef.current?.cachedLayout;
  return point.col !== undefined && point.row !== undefined && cachedLayout !== undefined
    ? {
        column: point.col - cachedLayout.x,
        row: point.row - cachedLayout.y,
      }
    : undefined;
};
//@ chunk-18hwfzwa.js:478015-478222 placement
function heldRowOffset(heldState, edge) {
  let { held, index, content } = heldState;
  if (held === null || index === null || held.index !== index || content === null) return -1;
  let heldTop = topWithin(held.node, content);
  let heldHeight = held.node.yogaNode?.getComputedHeight() ?? 0;
  return heldTop < 0 ? -1 : heldTop + (edge === "bottom" ? heldHeight : 0);
}
//@ chunk-18hwfzwa.js:478222-478594 placement
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
//@ chunk-18hwfzwa.js:478594-478807 placement
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
//@ chunk-18hwfzwa.js:478807-478919 placement
var wheelScrollHandler = (scrollState, deltaForDirection, resolvePoint) => (event) => {
  let direction = event.deltaY < 0 ? -1 : 1;
  scrollState.scrollBy(direction * deltaForDirection(direction), resolvePoint(event));
  event.preventDefault();
  event.stopPropagation();
};
//@ chunk-18hwfzwa.js:478919-479120 placement
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
//@ chunk-18hwfzwa.js:479120-479199 placement
function wheelScrollRows(scrollState, resolvePoint) {
  let wheelScrollStep = useWheelScrollStep();
  return wheelScrollHandler(
    scrollState,
    (direction) => wheelScrollStep(direction, performance.now()).rows,
    resolvePoint,
  );
}
//@ chunk-18hwfzwa.js:479199-479228 placement
var mergeShallow = (a, b) => ({
  ...a,
  ...b,
});
//@ chunk-18hwfzwa.js:479228-479232 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:479228", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:479232-479270 placement
var floorClampZero = (value) => Math.max(0, Math.floor(value));
//@ chunk-18hwfzwa.js:479270-481263 placement
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
//@ chunk-18hwfzwa.js:481263-481267 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:481263", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:481267-481394 placement
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
//@ chunk-18hwfzwa.js:481394-481398 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:481394", () => {
  init_react_production();
});
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
};
