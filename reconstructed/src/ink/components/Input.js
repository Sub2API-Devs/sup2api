/**
 * ink/components/Input.tsx
 *
 * 2.1.316 新增：Ink 输入组件与视口、选择、动画帧、绘制行等钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x6v6jz2y.js (41)
 * attribution: placement 41
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useDeclaredCursor } from "../hooks/use-declared-cursor.js";
import { assignRef } from "./ErrorBoundary.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";
import {
  init_react_production,
  useContext,
  useRef,
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
  useMemo,
  useReducer,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { TerminalSizeContext, StdinContextAlias } from "../terminalModes.js";
import { env } from "../../utils/env.js";
import { clockContext, noopClock, nullClock, defaultSetTimeout } from "./ClockContext.js";
import { useTerminalFocusState } from "../hooks/use-terminal-focus.js";
import { SCROLL_JUMP_LINES } from "../scrollConstants.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
import { isDescendantOf } from "../focus.js";
import { InputNowContext } from "../terminalProbe.js";
import { getSecondRootError } from "../terminal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-x6v6jz2y.js:19648-20724 placement
function InputImpl(props) {
  let $ = useMemoCache(30);
  let caret;
  let children;
  let onKeyDown;
  let onPaste;
  let ref;
  let rest;
  let autoFocusProp;
  let disabledProp;
  let allowPrintableKeybindingsProp;
  if ($[0] !== props) {
    ({
      ref,
      autoFocus: autoFocusProp,
      disabled: disabledProp,
      onKeyDown,
      onPaste,
      caret,
      allowPrintableKeybindings: allowPrintableKeybindingsProp,
      children,
      ...rest
    } = props);
    $[0] = props;
    $[1] = caret;
    $[2] = children;
    $[3] = onKeyDown;
    $[4] = onPaste;
    $[5] = ref;
    $[6] = rest;
    $[7] = autoFocusProp;
    $[8] = disabledProp;
    $[9] = allowPrintableKeybindingsProp;
  } else {
    caret = $[1];
    children = $[2];
    onKeyDown = $[3];
    onPaste = $[4];
    ref = $[5];
    rest = $[6];
    autoFocusProp = $[7];
    disabledProp = $[8];
    allowPrintableKeybindingsProp = $[9];
  }
  let autoFocus = autoFocusProp === undefined ? false : autoFocusProp;
  let isDisabled = disabledProp === undefined ? false : disabledProp;
  let allowPrintable = allowPrintableKeybindingsProp === undefined ? false : allowPrintableKeybindingsProp;
  const line = caret?.line ?? 0;
  const column = caret?.column ?? 0;
  const active = caret !== undefined;
  const visible = caret?.visible;
  let cursorState;
  if ($[10] !== line || $[11] !== column || $[12] !== active || $[13] !== visible) {
    cursorState = {
      line,
      column,
      active,
      visible,
    };
    $[10] = line;
    $[11] = column;
    $[12] = active;
    $[13] = visible;
    $[14] = cursorState;
  } else cursorState = $[14];
  let declaredCursor = useDeclaredCursor(cursorState);
  let mergedRef;
  if ($[15] !== declaredCursor || $[16] !== ref) {
    mergedRef = (node) => {
      declaredCursor(node);
      assignRef(ref, node);
    };
    $[15] = declaredCursor;
    $[16] = ref;
    $[17] = mergedRef;
  } else mergedRef = $[17];
  let ref_2 = mergedRef;
  if (isDisabled) {
    let disabledElement;
    if ($[18] !== children || $[19] !== ref_2 || $[20] !== rest) {
      disabledElement = jsxProd_default(BaseBox, {
        ref: ref_2,
        ...rest,
        children,
      });
      $[18] = children;
      $[19] = ref_2;
      $[20] = rest;
      $[21] = disabledElement;
    } else disabledElement = $[21];
    return disabledElement;
  }
  const textEntry = !allowPrintable;
  let inputElement;
  if (
    $[22] !== autoFocus ||
    $[23] !== children ||
    $[24] !== onKeyDown ||
    $[25] !== onPaste ||
    $[26] !== ref_2 ||
    $[27] !== rest ||
    $[28] !== textEntry
  ) {
    inputElement = jsxProd_default(BaseBox, {
      ref: ref_2,
      tabIndex: 0,
      autoFocus,
      textEntry,
      onKeyDown,
      onPaste,
      ...rest,
      children,
    });
    $[22] = autoFocus;
    $[23] = children;
    $[24] = onKeyDown;
    $[25] = onPaste;
    $[26] = ref_2;
    $[27] = rest;
    $[28] = textEntry;
    $[29] = inputElement;
  } else inputElement = $[29];
  return inputElement;
}
//@ chunk-x6v6jz2y.js:20724-20735 placement
var Input = InputImpl;
//@ chunk-x6v6jz2y.js:20735-20928 placement = Newline (0.591)
/**
 * <Newline>：输出 count 个换行的 ink-text。
 */
function Newline(props) {
  let $ = useMemoCache(4);
  let { count } = props;
  let count_2 = count === undefined ? 1 : count;
  let children;
  if ($[0] !== count_2) {
    children = `
`.repeat(count_2);
    $[0] = count_2;
    $[1] = children;
  } else children = $[1];
  let t3;
  if ($[2] !== children) {
    t3 = jsxProd_default("ink-text", {
      children,
    });
    $[2] = children;
    $[3] = t3;
  } else t3 = $[3];
  return t3;
}
//@ chunk-x6v6jz2y.js:20928-21267 placement = NoSelect (0.728)
/**
 * <NoSelect>：内容不参与鼠标选区复制（如行号栏、装饰符）；fromLeftEdge 时从屏幕最左列起整段不可选。
 */
function NoSelect(t0) {
  let $ = useMemoCache(9);
  let boxProps;
  let children;
  let fromLeftEdge;
  if ($[0] !== t0) {
    ({ children, fromLeftEdge, ...boxProps } = t0);
    $[0] = t0;
    $[1] = boxProps;
    $[2] = children;
    $[3] = fromLeftEdge;
  } else {
    boxProps = $[1];
    children = $[2];
    fromLeftEdge = $[3];
  }
  const alignSelf = fromLeftEdge ? "stretch" : undefined;
  const noSelect = fromLeftEdge ? "from-left-edge" : true;
  let t2;
  if ($[4] !== boxProps || $[5] !== children || $[6] !== alignSelf || $[7] !== noSelect) {
    t2 = jsxProd_default(BaseBox, {
      alignSelf,
      ...boxProps,
      noSelect,
      children,
    });
    $[4] = boxProps;
    $[5] = children;
    $[6] = alignSelf;
    $[7] = noSelect;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
}
//@ chunk-x6v6jz2y.js:21267-21564 placement = RawAnsi (0.805)
/**
 * <RawAnsi>：直接输出已排好的 ANSI 行（ink-raw-ansi），宽高由调用方给出，不再折行或测量。
 */
function RawAnsi(props) {
  let $ = useMemoCache(6);
  let { lines, width } = props;
  if (lines.length === 0) {
    return null;
  }
  let rawText;
  if ($[0] !== lines) {
    rawText = lines.join(`
`);
    $[0] = lines;
    $[1] = rawText;
  } else rawText = $[1];
  let t2;
  if ($[2] !== lines.length || $[3] !== rawText || $[4] !== width) {
    t2 = jsxProd_default("ink-raw-ansi", {
      rawText,
      rawWidth: width,
      rawHeight: lines.length,
    });
    $[2] = lines.length;
    $[3] = rawText;
    $[4] = width;
    $[5] = t2;
  } else t2 = $[5];
  return t2;
}
//@ chunk-x6v6jz2y.js:21564-21568 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:21564", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:21568-21572 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:21568", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:21572-22038 placement
/**
 * 节点当前是否在终端可见区域内：累加祖先偏移并减去滚动容器的 scrollTop，按根高度与终端行数推出视口范围；滚动容器尚未渲染时返回 null。
 */
function isNodeOnScreen(node, terminalSize) {
  if (!node?.yogaNode || !terminalSize) return null;
  let nodeHeight = node.yogaNode.getComputedHeight();
  let rows = terminalSize.rows;
  let top = node.yogaNode.getComputedTop();
  let { parentNode, yogaNode } = node;
  while (parentNode) {
    if (parentNode.yogaNode) {
      top += parentNode.yogaNode.getComputedTop();
      yogaNode = parentNode.yogaNode;
    }
    if (
      (parentNode.style.overflowY ?? parentNode.style.overflow) === "scroll" &&
      parentNode.scrollTopRendered === undefined
    )
      return null;
    if (parentNode.scrollTop) top -= clampScrollTop(parentNode);
    parentNode = parentNode.parentNode;
  }
  let rootHeight = yogaNode.getComputedHeight();
  let bottom = top + nodeHeight;
  let overflowRow = rootHeight > rows ? 1 : 0;
  let viewportTop = Math.max(0, rootHeight - rows) + overflowRow;
  let viewportBottom = viewportTop + rows;
  if (nodeHeight === 0) return top >= viewportTop && top < viewportBottom;
  return bottom > viewportTop && top < viewportBottom;
}
//@ chunk-x6v6jz2y.js:22038-22467 placement = useAnimationFrame (1)
/**
 * 跟踪组件是否在终端可见区域：返回 ref 回调、可见状态对象、读取函数与即时探测函数；每次提交后更新。动画类组件据此在不可见时停止刷新。
 */
function useTerminalViewport() {
  let clock = useContext(TerminalSizeContext);
  let nodeRef = useRef(null);
  let visibilityRef = useRef({
    isVisible: true,
  });
  let setRef = useCallback((node) => {
    nodeRef.current = node;
    if (node === null && !visibilityRef.current.isVisible)
      visibilityRef.current = {
        isVisible: true,
      };
  }, []);
  function computeVisibility() {
    let isVisible = isNodeOnScreen(nodeRef.current, clock);
    if (isVisible === null) return visibilityRef.current.isVisible;
    if (isVisible !== visibilityRef.current.isVisible)
      visibilityRef.current = {
        isVisible,
      };
    return isVisible;
  }
  let visibilityFnRef = useRef(computeVisibility);
  visibilityFnRef.current = computeVisibility;
  let getVisibility = useCallback(() => visibilityFnRef.current(), []);
  let clockRef = useRef(clock);
  clockRef.current = clock;
  let isNodeVisible = useCallback(() => isNodeOnScreen(nodeRef.current, clockRef.current), []);
  useLayoutEffect(() => {
    computeVisibility();
  });
  return [setRef, visibilityRef.current, getVisibility, isNodeVisible];
}
//@ chunk-x6v6jz2y.js:22467-22478 placement
var CURSOR_FLASH_MS = 480;
//@ chunk-x6v6jz2y.js:22478-22556 placement
function fullRepaintInterval(intervalMs) {
  return env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT ? Math.max(intervalMs, CURSOR_FLASH_MS) : intervalMs;
}
//@ chunk-x6v6jz2y.js:22556-22851 placement
function useAnimationFrame(intervalMs = 16) {
  let clock = useContext(clockContext);
  let [frame, { isVisible }, readVisibility] = useTerminalViewport();
  let terminalFocusState = useTerminalFocusState();
  let terminalFocusStateRef = useRef(terminalFocusState);
  let visible = isVisible;
  if (terminalFocusStateRef.current !== terminalFocusState) {
    terminalFocusStateRef.current = terminalFocusState;
    visible = readVisibility();
  }
  let isRunning = !!clock && visible && intervalMs !== null;
  let bucketMs =
    intervalMs === null
      ? null
      : Math.ceil(fullRepaintInterval(intervalMs) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let lastFrameRef = useRef(0);
  let frameValue = useSyncExternalStore(isRunning ? clock.subscribeKeepAlive : noopClock, () =>
    isRunning
      ? (lastFrameRef.current = Math.max(lastFrameRef.current, Math.floor(clock.now() / bucketMs) * bucketMs))
      : lastFrameRef.current,
  );
  return [frame, frameValue];
}
//@ chunk-x6v6jz2y.js:22851-22855 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:22851", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:22855-22879 placement
/**
 * 导出值：useInputClockValue（取输入时钟）。
 */
var useInputClockValue = () => useContext(APP_CONTEXT);
var useApp = useInputClockValue;
//@ chunk-x6v6jz2y.js:22879-22883 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:22879", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:22883-23169 placement = cleanupTaskOutput (0.67)
function useDebouncedCallback(callback, delayMs) {
  let clock = useContext(clockContext);
  let callbackRef = useRef(callback);
  callbackRef.current = callback;
  let code = useRef(null);
  let cleanupFn = useCallback((cancel) => () => code.current?.(), []);
  useSyncExternalStore(cleanupFn, nullClock);
  let setTimeoutImpl = clock?.setTimeout ?? defaultSetTimeout;
  return useMemo(() => {
    let debounced = (...args) => {
      code.current?.();
      code.current = setTimeoutImpl(() => {
        code.current = null;
        callbackRef.current(...args);
      }, delayMs);
    };
    debounced.cancel = () => {
      code.current?.();
      code.current = null;
    };
    return debounced;
  }, [setTimeoutImpl, delayMs]);
}
//@ chunk-x6v6jz2y.js:23169-23173 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:23169", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:23173-23191 placement
var noopClockA = () => () => {};
//@ chunk-x6v6jz2y.js:23191-23559 placement
function useFocus() {
  let { focusManager, rootNode } = useContext(APP_CONTEXT);
  let activeElement = useSyncExternalStore(
    focusManager?.subscribe ?? noopClockA,
    () => focusManager?.activeElement ?? null,
  );
  return useMemo(
    () => ({
      activeElement,
      focusNext: () => {
        if (focusManager && rootNode) focusManager.focusNext(rootNode);
      },
      focusPrevious: () => {
        if (focusManager && rootNode) focusManager.focusPrevious(rootNode);
      },
      focusDirection: (direction) => {
        if (focusManager && rootNode) return focusManager.focusDirection(direction, rootNode);
        return false;
      },
      focus: (node) => focusManager?.focus(node),
      blur: () => focusManager?.blur(),
      subscribe: focusManager?.subscribe ?? noopClockA,
    }),
    [activeElement, focusManager, rootNode],
  );
}
//@ chunk-x6v6jz2y.js:23559-23563 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:23559", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:23563-23581 placement
var noopClockB = () => () => {};
//@ chunk-x6v6jz2y.js:23581-23734 placement
function useHasFocus(nodeRef) {
  let { focusManager } = useContext(APP_CONTEXT);
  return useSyncExternalStore(
    focusManager?.subscribe ?? noopClockB,
    () => {
      let node = nodeRef.current;
      let activeElement = focusManager?.activeElement;
      if (!node || !activeElement) return false;
      return isDescendantOf(activeElement, node);
    },
    () => false,
  );
}
//@ chunk-x6v6jz2y.js:23734-23738 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:23734", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:23738-23771 placement
function useInputClock() {
  return useContext(InputNowContext) ?? nowMs;
}
//@ chunk-x6v6jz2y.js:23771-23803 placement
function nowMs() {
  return Date.now();
}
//@ chunk-x6v6jz2y.js:23803-23807 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:23803", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:23807-24120 placement
function useAnimationTimer(intervalMs) {
  let clock = useContext(clockContext);
  let bucketMs =
    intervalMs === null
      ? null
      : Math.ceil(fullRepaintInterval(intervalMs) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let lastFrameRef = useRef(null);
  let subscribeFollower = useMemo(() => {
    if (!clock || bucketMs === null) return noopClock;
    return (onTick) =>
      clock.subscribeFollower(() => {
        lastFrameRef.current = clock.now();
        onTick();
      });
  }, [clock, bucketMs]);
  return useSyncExternalStore(subscribeFollower, () => {
    if (!clock || bucketMs === null) {
      lastFrameRef.current = null;
      return 0;
    }
    if (lastFrameRef.current === null) lastFrameRef.current = clock.now();
    return Math.floor(lastFrameRef.current / bucketMs) * bucketMs;
  });
}
//@ chunk-x6v6jz2y.js:24120-24359 placement
function useInterval(callback, intervalMs, options) {
  let callbackRef = useRef(callback);
  callbackRef.current = callback;
  let clock = useContext(clockContext);
  let immediate = options?.immediate ?? false;
  let lastRunRef = useRef(null);
  let subscribeEffect = useMemo(
    () =>
      !clock || intervalMs === null
        ? (noopSubscribe) => {
            lastRunRef.current = null;
            return () => {};
          }
        : (tickFn) => {
            if (immediate && lastRunRef.current === null) callbackRef.current();
            lastRunRef.current = intervalMs;
            return startClockInterval(clock, () => callbackRef.current(), intervalMs);
          },
    [clock, intervalMs, immediate],
  );
  useSyncExternalStore(subscribeEffect, nullClock);
}
//@ chunk-x6v6jz2y.js:24359-24495 placement
function startClockInterval(clock, tick, intervalMs) {
  let isStopped = false;
  let cancelTimer;
  let runTick = () => {
    if (isStopped) return;
    try {
      tick();
    } finally {
      if (!isStopped) cancelTimer = clock.setTimeout(runTick, intervalMs);
    }
  };
  cancelTimer = clock.setTimeout(runTick, intervalMs);
  return () => {
    isStopped = true;
    cancelTimer();
  };
}
//@ chunk-x6v6jz2y.js:24495-24499 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:24495", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:24499-24618 placement
function useMeasured(select) {
  let { subscribeLayout } = useContext(APP_CONTEXT);
  let value = useSyncExternalStore(subscribeLayout, select);
  let [, forceRender] = useReducer((count) => count + 1, 0);
  useLayoutEffect(() => {
    if (!Object.is(select(), value)) forceRender();
  });
  return value;
}
//@ chunk-x6v6jz2y.js:24618-24622 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:24618", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:24622-24696 placement
function useFinePointer(retain) {
  let { retainFinePointer } = useContext(APP_CONTEXT);
  useEffect(() => (retain ? retainFinePointer() : undefined), [retain, retainFinePointer]);
}
//@ chunk-x6v6jz2y.js:24696-24700 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:24696", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:24700-24821 placement
function nodeRowRange(node) {
  if (!node?.yogaNode) return;
  if (node.yogaNode.getDisplay() === 1) return null;
  let placement = absoluteTop(node);
  return placement && scrollAdjustedRow(node, placement.box, placement.at);
}
//@ chunk-x6v6jz2y.js:24821-24974 placement
function nodeScreenBox(node) {
  let placement = node?.yogaNode && absoluteTop(node);
  if (!placement) return;
  return {
    row: placement.row,
    rows: node?.yogaNode?.getComputedHeight() ?? 0,
    viewportRows: placement.box.scrollViewportHeight,
  };
}
//@ chunk-x6v6jz2y.js:24974-25358 placement
function absoluteTop(node) {
  let row = 0;
  let current = node;
  for (;;) {
    let parentNode = current.parentNode;
    if (!parentNode?.yogaNode || !current.yogaNode) return;
    row += current.yogaNode.getComputedTop();
    let parentNode_2 = parentNode.parentNode;
    if (
      parentNode_2?.yogaNode !== undefined &&
      (parentNode_2.style.overflowY ?? parentNode_2.style.overflow) === "scroll"
    )
      return {
        box: parentNode_2,
        row,
        at: {
          top: parentNode.yogaNode.getComputedTop() + row,
          itemTop: parentNode.yogaNode.getComputedTop() + current.yogaNode.getComputedTop(),
          itemHeight: current.yogaNode.getComputedHeight(),
        },
      };
    current = parentNode;
  }
}
//@ chunk-x6v6jz2y.js:25358-25742 placement
function scrollAdjustedRow(itemNode, box, at) {
  let { scrollTopRendered, yogaNode } = box;
  let computedHeight = itemNode.yogaNode?.getComputedHeight();
  if (scrollTopRendered === undefined || !yogaNode || !computedHeight) return;
  let computedBorder = yogaNode.getComputedBorder(1);
  let innerBottom = yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3);
  let innerTop = computedBorder + yogaNode.getComputedPadding(1);
  let innerBottomPadding = innerBottom - yogaNode.getComputedPadding(3);
  let topInBox = at.top - scrollTopRendered;
  let itemTopInBox = at.itemTop - scrollTopRendered;
  let isFullyClipped = itemTopInBox + at.itemHeight <= innerTop || itemTopInBox >= innerBottomPadding;
  let max = Math.max(topInBox, computedBorder);
  let min = Math.min(topInBox + computedHeight, innerBottom);
  return isFullyClipped || max >= min
    ? null
    : {
        first: max - topInBox,
        last: min - topInBox - 1,
        of: computedHeight,
      };
}
//@ chunk-x6v6jz2y.js:25742-26370 placement
function usePaintedRows(isEnabled, rows) {
  let { subscribeFrames } = useContext(APP_CONTEXT);
  let nodeRef = useRef(null);
  let lastStateRef = useRef({
    rows,
    lastRows: undefined,
    contentRows: undefined,
  });
  let rowsState = useSyncExternalStore(
    useCallback((onFrame) => (isEnabled ? subscribeFrames(onFrame) : () => {}), [isEnabled, subscribeFrames]),
    useCallback(() => {
      if (!isEnabled) return;
      let computedHeight = nodeRef.current?.yogaNode?.getComputedHeight();
      let reduced = nodeRef.current?.childNodes.reduce(
        (acc, childNode) => acc + (childNode.yogaNode?.getComputedHeight() ?? 0),
        0,
      );
      let rowsRange = nodeRowRange(nodeRef.current);
      let previous = lastStateRef.current;
      let rowsUnchanged =
        rowsRange === undefined ||
        rowsRange === previous.rows ||
        (!!rowsRange &&
          !!previous.rows &&
          rowsRange.first === previous.rows.first &&
          rowsRange.last === previous.rows.last &&
          rowsRange.of === previous.rows.of);
      let contentRows = computedHeight === undefined ? undefined : reduced;
      if (!(rowsUnchanged && contentRows === previous.contentRows))
        lastStateRef.current = {
          rows: rowsUnchanged ? previous.rows : rowsRange,
          lastRows: computedHeight || previous.lastRows,
          contentRows,
        };
      else if (computedHeight) previous.lastRows = computedHeight;
      return lastStateRef.current;
    }, [isEnabled]),
  );
  return [nodeRef, rowsState?.rows, rowsState?.lastRows, rowsState?.contentRows];
}
//@ chunk-x6v6jz2y.js:26370-26374 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:26370", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:26374-27033 placement = useSelection (0.958)
/**
 * 选区操作钩子：复制（并清除）/复制不清除、取选中文本、清除、是否有选区、读状态、订阅变化、键盘移动焦点、设置选区背景色。没有 Ink 实例时返回空实现。
 */
function useSelection() {
  useContext(StdinContextAlias);
  let ink = getSecondRootError().get(process.stdout);
  return useMemo(() => {
    if (!ink)
      return {
        copySelection: () => "",
        copySelectionNoClear: () => "",
        getSelectedText: () => "",
        clearSelection: () => {},
        hasSelection: () => false,
        getState: () => null,
        subscribe: () => () => {},
        moveFocus: () => {},
        setSelectionBgColor: () => {},
      };
    return {
      copySelection: () => ink.copySelection(),
      copySelectionNoClear: () => ink.copySelectionNoClear(),
      getSelectedText: () => ink.getSelectedText(),
      clearSelection: () => ink.clearTextSelection(),
      hasSelection: () => ink.hasTextSelection(),
      getState: () => ink.selection,
      subscribe: (cb) => ink.subscribeToSelectionChange(cb),
      moveFocus: (move) => ink.moveSelectionFocus(move),
      setSelectionBgColor: (color) => ink.setSelectionBgColor(color),
    };
  }, [ink]);
}
export {
  useHasFocus,
  useTerminalViewport,
  useInterval,
  useAnimationFrame,
  NoSelect,
  RawAnsi,
  useMeasured,
  useDebouncedCallback,
  useSelection,
  useApp,
  useInputClock,
  useAnimationTimer,
  nodeRowRange,
  nodeScreenBox,
  startClockInterval,
  useFocus,
  Newline,
  Input,
  fullRepaintInterval,
  useFinePointer,
  usePaintedRows,
};
