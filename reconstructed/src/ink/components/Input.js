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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useDeclaredCursor } from "../hooks/use-declared-cursor.js";
import { assignRef } from "./ErrorBoundary.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";
import {
  init_react_production,
  Se,
  R,
  ce,
  zt,
  yt,
  Q,
  Uy,
  P,
} from "../../../vendor/react/cjs/react.production.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { TerminalSizeContext, StdinContextAlias } from "../terminalModes.js";
import { env } from "../../utils/env.js";
import { clockContext, noopClock, nullClock, defaultSetTimeout } from "./ClockContext.js";
import { useTerminalFocusState } from "../hooks/use-terminal-focus.js";
import { SCROLL_JUMP_LINES } from "../scrollConstants.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { isDescendantOf } from "../focus.js";
import { InputNowContext } from "../terminalProbe.js";
import { getSecondRootError } from "../terminal.js";

//@ chunk-x6v6jz2y.js:19648-20724 placement
function InputImpl(o) {
  let r = w(30);
  let l;
  let children;
  let onKeyDown;
  let onPaste;
  let m;
  let b;
  let C;
  let h;
  let k;
  if (r[0] !== o) {
    ({
      ref: m,
      autoFocus: C,
      disabled: h,
      onKeyDown,
      onPaste,
      caret: l,
      allowPrintableKeybindings: k,
      children,
      ...b
    } = o);
    r[0] = o;
    r[1] = l;
    r[2] = children;
    r[3] = onKeyDown;
    r[4] = onPaste;
    r[5] = m;
    r[6] = b;
    r[7] = C;
    r[8] = h;
    r[9] = k;
  } else {
    l = r[1];
    children = r[2];
    onKeyDown = r[3];
    onPaste = r[4];
    m = r[5];
    b = r[6];
    C = r[7];
    h = r[8];
    k = r[9];
  }
  let autoFocus = C === undefined ? false : C;
  let E = h === undefined ? false : h;
  let A = k === undefined ? false : k;
  const line = l?.line ?? 0;
  const column = l?.column ?? 0;
  const active = l !== undefined;
  const visible = l?.visible;
  let F;
  if (r[10] !== line || r[11] !== column || r[12] !== active || r[13] !== visible) {
    F = {
      line,
      column,
      active,
      visible,
    };
    r[10] = line;
    r[11] = column;
    r[12] = active;
    r[13] = visible;
    r[14] = F;
  } else F = r[14];
  let declaredCursor = useDeclaredCursor(F);
  let _;
  if (r[15] !== declaredCursor || r[16] !== m) {
    _ = (H) => {
      declaredCursor(H);
      assignRef(m, H);
    };
    r[15] = declaredCursor;
    r[16] = m;
    r[17] = _;
  } else _ = r[17];
  let ref = _;
  if (E) {
    let D;
    if (r[18] !== children || r[19] !== ref || r[20] !== b) {
      D = jsxProd_default(BaseBox, {
        ref,
        ...b,
        children,
      });
      r[18] = children;
      r[19] = ref;
      r[20] = b;
      r[21] = D;
    } else D = r[21];
    return D;
  }
  const textEntry = !A;
  let U;
  if (
    r[22] !== autoFocus ||
    r[23] !== children ||
    r[24] !== onKeyDown ||
    r[25] !== onPaste ||
    r[26] !== ref ||
    r[27] !== b ||
    r[28] !== textEntry
  ) {
    U = jsxProd_default(BaseBox, {
      ref,
      tabIndex: 0,
      autoFocus,
      textEntry,
      onKeyDown,
      onPaste,
      ...b,
      children,
    });
    r[22] = autoFocus;
    r[23] = children;
    r[24] = onKeyDown;
    r[25] = onPaste;
    r[26] = ref;
    r[27] = b;
    r[28] = textEntry;
    r[29] = U;
  } else U = r[29];
  return U;
}
//@ chunk-x6v6jz2y.js:20724-20735 placement
var Input = InputImpl;
//@ chunk-x6v6jz2y.js:20735-20928 placement = Newline (0.591)
/**
 * <Newline>：输出 count 个换行的 ink-text。
 */
function Newline(props) {
  let $ = w(4);
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
  let $ = w(9);
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
  let $ = w(6);
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
init_react_production();
//@ chunk-x6v6jz2y.js:21568-21572 placement
init_react_production();
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
  let clock = Se(TerminalSizeContext);
  let r = R(null);
  let l = R({
    isVisible: true,
  });
  let u = ce((h) => {
    r.current = h;
    if (h === null && !l.current.isVisible)
      l.current = {
        isVisible: true,
      };
  }, []);
  function d() {
    let h = isNodeOnScreen(r.current, clock);
    if (h === null) return l.current.isVisible;
    if (h !== l.current.isVisible)
      l.current = {
        isVisible: h,
      };
    return h;
  }
  let p = R(d);
  p.current = d;
  let m = ce(() => p.current(), []);
  let clockRef = R(clock);
  clockRef.current = clock;
  let C = ce(() => isNodeOnScreen(r.current, clockRef.current), []);
  zt(() => {
    d();
  });
  return [u, l.current, m, C];
}
//@ chunk-x6v6jz2y.js:22467-22478 placement
var CURSOR_FLASH_MS = 480;
//@ chunk-x6v6jz2y.js:22478-22556 placement
function fullRepaintInterval(o) {
  return env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT ? Math.max(o, CURSOR_FLASH_MS) : o;
}
//@ chunk-x6v6jz2y.js:22556-22851 placement
function useAnimationFrame(o = 16) {
  let r = Se(clockContext);
  let [l, { isVisible: u }, d] = useTerminalViewport();
  let terminalFocusState = useTerminalFocusState();
  let terminalFocusStateRef = R(terminalFocusState);
  let b = u;
  if (terminalFocusStateRef.current !== terminalFocusState) {
    terminalFocusStateRef.current = terminalFocusState;
    b = d();
  }
  let C = !!r && b && o !== null;
  let h = o === null ? null : Math.ceil(fullRepaintInterval(o) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let k = R(0);
  let x = yt(C ? r.subscribeKeepAlive : noopClock, () =>
    C ? (k.current = Math.max(k.current, Math.floor(r.now() / h) * h)) : k.current,
  );
  return [l, x];
}
//@ chunk-x6v6jz2y.js:22851-22855 placement
init_react_production();
//@ chunk-x6v6jz2y.js:22855-22879 placement
/**
 * 导出值：useInputClockValue（取输入时钟）。
 */
var useInputClockValue = () => Se(kp);
var useApp = useInputClockValue;
//@ chunk-x6v6jz2y.js:22879-22883 placement
init_react_production();
//@ chunk-x6v6jz2y.js:22883-23169 placement = cleanupTaskOutput (0.67)
function useDebouncedCallback(o, r) {
  let l = Se(clockContext);
  let u = R(o);
  u.current = o;
  let code = R(null);
  let p = ce((b) => () => code.current?.(), []);
  yt(p, nullClock);
  let m = l?.setTimeout ?? defaultSetTimeout;
  return Q(() => {
    let b = (...C) => {
      code.current?.();
      code.current = m(() => {
        code.current = null;
        u.current(...C);
      }, r);
    };
    b.cancel = () => {
      code.current?.();
      code.current = null;
    };
    return b;
  }, [m, r]);
}
//@ chunk-x6v6jz2y.js:23169-23173 placement
init_react_production();
//@ chunk-x6v6jz2y.js:23173-23191 placement
var noopClockA = () => () => {};
//@ chunk-x6v6jz2y.js:23191-23559 placement
function useFocus() {
  let { focusManager, rootNode } = Se(kp);
  let l = yt(focusManager?.subscribe ?? noopClockA, () => focusManager?.activeElement ?? null);
  return Q(
    () => ({
      activeElement: l,
      focusNext: () => {
        if (focusManager && rootNode) focusManager.focusNext(rootNode);
      },
      focusPrevious: () => {
        if (focusManager && rootNode) focusManager.focusPrevious(rootNode);
      },
      focusDirection: (u) => {
        if (focusManager && rootNode) return focusManager.focusDirection(u, rootNode);
        return false;
      },
      focus: (u) => focusManager?.focus(u),
      blur: () => focusManager?.blur(),
      subscribe: focusManager?.subscribe ?? noopClockA,
    }),
    [l, focusManager, rootNode],
  );
}
//@ chunk-x6v6jz2y.js:23559-23563 placement
init_react_production();
//@ chunk-x6v6jz2y.js:23563-23581 placement
var noopClockB = () => () => {};
//@ chunk-x6v6jz2y.js:23581-23734 placement
function useHasFocus(o) {
  let { focusManager } = Se(kp);
  return yt(
    focusManager?.subscribe ?? noopClockB,
    () => {
      let l = o.current;
      let activeElement = focusManager?.activeElement;
      if (!l || !activeElement) return false;
      return isDescendantOf(activeElement, l);
    },
    () => false,
  );
}
//@ chunk-x6v6jz2y.js:23734-23738 placement
init_react_production();
//@ chunk-x6v6jz2y.js:23738-23771 placement
function useInputClock() {
  return Se(InputNowContext) ?? nowMs;
}
//@ chunk-x6v6jz2y.js:23771-23803 placement
function nowMs() {
  return Date.now();
}
//@ chunk-x6v6jz2y.js:23803-23807 placement
init_react_production();
//@ chunk-x6v6jz2y.js:23807-24120 placement
function useAnimationTimer(o) {
  let r = Se(clockContext);
  let l = o === null ? null : Math.ceil(fullRepaintInterval(o) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let u = R(null);
  let d = Q(() => {
    if (!r || l === null) return noopClock;
    return (p) =>
      r.subscribeFollower(() => {
        u.current = r.now();
        p();
      });
  }, [r, l]);
  return yt(d, () => {
    if (!r || l === null) {
      u.current = null;
      return 0;
    }
    if (u.current === null) u.current = r.now();
    return Math.floor(u.current / l) * l;
  });
}
//@ chunk-x6v6jz2y.js:24120-24359 placement
function useInterval(o, r, l) {
  let u = R(o);
  u.current = o;
  let d = Se(clockContext);
  let immediate = l?.immediate ?? false;
  let m = R(null);
  let b = Q(
    () =>
      !d || r === null
        ? (C) => {
            m.current = null;
            return () => {};
          }
        : (C) => {
            if (immediate && m.current === null) u.current();
            m.current = r;
            return startClockInterval(d, () => u.current(), r);
          },
    [d, r, immediate],
  );
  yt(b, nullClock);
}
//@ chunk-x6v6jz2y.js:24359-24495 placement
function startClockInterval(o, r, l) {
  let u = false;
  let d;
  let p = () => {
    if (u) return;
    try {
      r();
    } finally {
      if (!u) d = o.setTimeout(p, l);
    }
  };
  d = o.setTimeout(p, l);
  return () => {
    u = true;
    d();
  };
}
//@ chunk-x6v6jz2y.js:24495-24499 placement
init_react_production();
//@ chunk-x6v6jz2y.js:24499-24618 placement
function useMeasured(o) {
  let { subscribeLayout } = Se(kp);
  let l = yt(subscribeLayout, o);
  let [, u] = Uy((d) => d + 1, 0);
  zt(() => {
    if (!Object.is(o(), l)) u();
  });
  return l;
}
//@ chunk-x6v6jz2y.js:24618-24622 placement
init_react_production();
//@ chunk-x6v6jz2y.js:24622-24696 placement
function useFinePointer(o) {
  let { retainFinePointer } = Se(kp);
  P(() => (o ? retainFinePointer() : undefined), [o, retainFinePointer]);
}
//@ chunk-x6v6jz2y.js:24696-24700 placement
init_react_production();
//@ chunk-x6v6jz2y.js:24700-24821 placement
function nodeRowRange(o) {
  if (!o?.yogaNode) return;
  if (o.yogaNode.getDisplay() === 1) return null;
  let r = absoluteTop(o);
  return r && scrollAdjustedRow(o, r.box, r.at);
}
//@ chunk-x6v6jz2y.js:24821-24974 placement
function nodeScreenBox(o) {
  let r = o?.yogaNode && absoluteTop(o);
  if (!r) return;
  return {
    row: r.row,
    rows: o?.yogaNode?.getComputedHeight() ?? 0,
    viewportRows: r.box.scrollViewportHeight,
  };
}
//@ chunk-x6v6jz2y.js:24974-25358 placement
function absoluteTop(o) {
  let r = 0;
  let l = o;
  for (;;) {
    let parentNode = l.parentNode;
    if (!parentNode?.yogaNode || !l.yogaNode) return;
    r += l.yogaNode.getComputedTop();
    let parentNode_2 = parentNode.parentNode;
    if (
      parentNode_2?.yogaNode !== undefined &&
      (parentNode_2.style.overflowY ?? parentNode_2.style.overflow) === "scroll"
    )
      return {
        box: parentNode_2,
        row: r,
        at: {
          top: parentNode.yogaNode.getComputedTop() + r,
          itemTop: parentNode.yogaNode.getComputedTop() + l.yogaNode.getComputedTop(),
          itemHeight: l.yogaNode.getComputedHeight(),
        },
      };
    l = parentNode;
  }
}
//@ chunk-x6v6jz2y.js:25358-25742 placement
function scrollAdjustedRow(o, box, l) {
  let { scrollTopRendered, yogaNode } = box;
  let computedHeight = o.yogaNode?.getComputedHeight();
  if (scrollTopRendered === undefined || !yogaNode || !computedHeight) return;
  let computedBorder = yogaNode.getComputedBorder(1);
  let b = yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3);
  let C = computedBorder + yogaNode.getComputedPadding(1);
  let h = b - yogaNode.getComputedPadding(3);
  let k = l.top - scrollTopRendered;
  let x = l.itemTop - scrollTopRendered;
  let E = x + l.itemHeight <= C || x >= h;
  let max = Math.max(k, computedBorder);
  let min = Math.min(k + computedHeight, b);
  return E || max >= min
    ? null
    : {
        first: max - k,
        last: min - k - 1,
        of: computedHeight,
      };
}
//@ chunk-x6v6jz2y.js:25742-26370 placement
function usePaintedRows(o, rows) {
  let { subscribeFrames } = Se(kp);
  let u = R(null);
  let d = R({
    rows,
    lastRows: undefined,
    contentRows: undefined,
  });
  let p = yt(
    ce((m) => (o ? subscribeFrames(m) : () => {}), [o, subscribeFrames]),
    ce(() => {
      if (!o) return;
      let computedHeight = u.current?.yogaNode?.getComputedHeight();
      let reduced = u.current?.childNodes.reduce(
        (acc, childNode) => acc + (childNode.yogaNode?.getComputedHeight() ?? 0),
        0,
      );
      let C = nodeRowRange(u.current);
      let h = d.current;
      let k =
        C === undefined ||
        C === h.rows ||
        (!!C && !!h.rows && C.first === h.rows.first && C.last === h.rows.last && C.of === h.rows.of);
      let x = computedHeight === undefined ? undefined : reduced;
      if (!(k && x === h.contentRows))
        d.current = {
          rows: k ? h.rows : C,
          lastRows: computedHeight || h.lastRows,
          contentRows: x,
        };
      else if (computedHeight) h.lastRows = computedHeight;
      return d.current;
    }, [o]),
  );
  return [u, p?.rows, p?.lastRows, p?.contentRows];
}
//@ chunk-x6v6jz2y.js:26370-26374 placement
init_react_production();
//@ chunk-x6v6jz2y.js:26374-27033 placement = useSelection (0.958)
/**
 * 选区操作钩子：复制（并清除）/复制不清除、取选中文本、清除、是否有选区、读状态、订阅变化、键盘移动焦点、设置选区背景色。没有 Ink 实例时返回空实现。
 */
function useSelection() {
  Se(StdinContextAlias);
  let ink = getSecondRootError().get(process.stdout);
  return Q(() => {
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
