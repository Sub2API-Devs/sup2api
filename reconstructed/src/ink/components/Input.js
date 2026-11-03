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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";
import { j, Se, R, ce, zt, yt, Q, Uy, P } from "../../../vendor/react/cjs/react.production.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { TerminalSizeContext, StdinContextAlias } from "../terminalModes.js";
import { env } from "../../utils/env.js";
import { _T, bTe, exr, $L } from "./ClockContext.js";
import { vye } from "../hooks/use-terminal-focus.js";
import { Xh } from "../scrollConstants.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { isDescendantOf } from "../focus.js";
import { InputNowContext } from "../terminalProbe.js";
import { di } from "../terminal.js";

//@ chunk-x6v6jz2y.js:19648-20724 placement
function InputImpl(o) {
  let r = w(30),
    l,
    u,
    d,
    p,
    m,
    b,
    C,
    h,
    k;
  if (r[0] !== o)
    (({
      ref: m,
      autoFocus: C,
      disabled: h,
      onKeyDown: d,
      onPaste: p,
      caret: l,
      allowPrintableKeybindings: k,
      children: u,
      ...b
    } = o),
      (r[0] = o),
      (r[1] = l),
      (r[2] = u),
      (r[3] = d),
      (r[4] = p),
      (r[5] = m),
      (r[6] = b),
      (r[7] = C),
      (r[8] = h),
      (r[9] = k));
  else
    ((l = r[1]),
      (u = r[2]),
      (d = r[3]),
      (p = r[4]),
      (m = r[5]),
      (b = r[6]),
      (C = r[7]),
      (h = r[8]),
      (k = r[9]));
  let x = C === void 0 ? !1 : C,
    E = h === void 0 ? !1 : h,
    A = k === void 0 ? !1 : k;
  const T = l?.line ?? 0,
    M = l?.column ?? 0,
    I = l !== void 0,
    O = l?.visible;
  let F;
  if (r[10] !== T || r[11] !== M || r[12] !== I || r[13] !== O)
    ((F = { line: T, column: M, active: I, visible: O }),
      (r[10] = T),
      (r[11] = M),
      (r[12] = I),
      (r[13] = O),
      (r[14] = F));
  else F = r[14];
  let B = useDeclaredCursor(F),
    _;
  if (r[15] !== B || r[16] !== m)
    ((_ = (H) => {
      (B(H), assignRef(m, H));
    }),
      (r[15] = B),
      (r[16] = m),
      (r[17] = _));
  else _ = r[17];
  let L = _;
  if (E) {
    let D;
    if (r[18] !== u || r[19] !== L || r[20] !== b)
      ((D = e(BaseBox, { ref: L, ...b, children: u })), (r[18] = u), (r[19] = L), (r[20] = b), (r[21] = D));
    else D = r[21];
    return D;
  }
  const D = !A;
  let U;
  if (r[22] !== x || r[23] !== u || r[24] !== d || r[25] !== p || r[26] !== L || r[27] !== b || r[28] !== D)
    ((U = e(BaseBox, {
      ref: L,
      tabIndex: 0,
      autoFocus: x,
      textEntry: D,
      onKeyDown: d,
      onPaste: p,
      ...b,
      children: u,
    })),
      (r[22] = x),
      (r[23] = u),
      (r[24] = d),
      (r[25] = p),
      (r[26] = L),
      (r[27] = b),
      (r[28] = D),
      (r[29] = U));
  else U = r[29];
  return U;
}
//@ chunk-x6v6jz2y.js:20724-20735 placement
var Input = InputImpl;
/**
 * <Newline>：输出 count 个换行的 ink-text。
 */
//@ chunk-x6v6jz2y.js:20735-20928 placement = Newline (0.591)
function Newline(t0) {
  let u = w(4),
    { count: t1 } = t0,
    count = t1 === void 0 ? 1 : t1,
    d;
  if (u[0] !== count)
    ((d = `
`.repeat(count)),
      (u[0] = count),
      (u[1] = d));
  else d = u[1];
  let p;
  if (u[2] !== d) ((p = e("ink-text", { children: d })), (u[2] = d), (u[3] = p));
  else p = u[3];
  return p;
}
/**
 * <NoSelect>：内容不参与鼠标选区复制（如行号栏、装饰符）；fromLeftEdge 时从屏幕最左列起整段不可选。
 */
//@ chunk-x6v6jz2y.js:20928-21267 placement = NoSelect (0.728)
function NoSelect(t0) {
  let r = w(9),
    l,
    u,
    d;
  if (r[0] !== t0)
    (({ children: u, fromLeftEdge: d, ...l } = t0), (r[0] = t0), (r[1] = l), (r[2] = u), (r[3] = d));
  else ((l = r[1]), (u = r[2]), (d = r[3]));
  const p = d ? "stretch" : void 0,
    m = d ? "from-left-edge" : !0;
  let b;
  if (r[4] !== l || r[5] !== u || r[6] !== p || r[7] !== m)
    ((b = e(BaseBox, { alignSelf: p, ...l, noSelect: m, children: u })),
      (r[4] = l),
      (r[5] = u),
      (r[6] = p),
      (r[7] = m),
      (r[8] = b));
  else b = r[8];
  return b;
}
/**
 * <RawAnsi>：直接输出已排好的 ANSI 行（ink-raw-ansi），宽高由调用方给出，不再折行或测量。
 */
//@ chunk-x6v6jz2y.js:21267-21564 placement = RawAnsi (0.805)
function RawAnsi(t0) {
  let u = w(6),
    { lines: lines, width: width } = t0;
  if (lines.length === 0) {
    return null;
  }
  let d;
  if (u[0] !== lines)
    ((d = lines.join(`
`)),
      (u[0] = lines),
      (u[1] = d));
  else d = u[1];
  let p;
  if (u[2] !== lines.length || u[3] !== d || u[4] !== width)
    ((p = e("ink-raw-ansi", { rawText: d, rawWidth: width, rawHeight: lines.length })),
      (u[2] = lines.length),
      (u[3] = d),
      (u[4] = width),
      (u[5] = p));
  else p = u[5];
  return p;
}
//@ chunk-x6v6jz2y.js:21564-21568 placement
j();
//@ chunk-x6v6jz2y.js:21568-21572 placement
j();
/**
 * 节点当前是否在终端可见区域内：累加祖先偏移并减去滚动容器的 scrollTop，按根高度与终端行数推出视口范围；滚动容器尚未渲染时返回 null。
 */
//@ chunk-x6v6jz2y.js:21572-22038 placement
function isNodeOnScreen(node, terminalSize) {
  if (!node?.yogaNode || !terminalSize) return null;
  let nodeHeight = node.yogaNode.getComputedHeight(),
    rows = terminalSize.rows,
    top = node.yogaNode.getComputedTop(),
    { parentNode: parentNode, yogaNode: yogaNode } = node;
  while (parentNode) {
    if (parentNode.yogaNode)
      ((top += parentNode.yogaNode.getComputedTop()), (yogaNode = parentNode.yogaNode));
    if (
      (parentNode.style.overflowY ?? parentNode.style.overflow) === "scroll" &&
      parentNode.scrollTopRendered === void 0
    )
      return null;
    if (parentNode.scrollTop) top -= clampScrollTop(parentNode);
    parentNode = parentNode.parentNode;
  }
  let rootHeight = yogaNode.getComputedHeight(),
    bottom = top + nodeHeight,
    overflowRow = rootHeight > rows ? 1 : 0,
    viewportTop = Math.max(0, rootHeight - rows) + overflowRow,
    viewportBottom = viewportTop + rows;
  if (nodeHeight === 0) return top >= viewportTop && top < viewportBottom;
  return bottom > viewportTop && top < viewportBottom;
}
/**
 * 跟踪组件是否在终端可见区域：返回 ref 回调、可见状态对象、读取函数与即时探测函数；每次提交后更新。动画类组件据此在不可见时停止刷新。
 */
//@ chunk-x6v6jz2y.js:22038-22467 placement = useAnimationFrame (1)
function useTerminalViewport() {
  let clock = Se(TerminalSizeContext),
    r = R(null),
    l = R({ isVisible: !0 }),
    u = ce((h) => {
      if (((r.current = h), h === null && !l.current.isVisible)) l.current = { isVisible: !0 };
    }, []);
  function d() {
    let h = isNodeOnScreen(r.current, clock);
    if (h === null) return l.current.isVisible;
    if (h !== l.current.isVisible) l.current = { isVisible: h };
    return h;
  }
  let p = R(d);
  p.current = d;
  let m = ce(() => p.current(), []),
    b = R(clock);
  b.current = clock;
  let C = ce(() => isNodeOnScreen(r.current, b.current), []);
  return (
    zt(() => {
      d();
    }),
    [u, l.current, m, C]
  );
}
//@ chunk-x6v6jz2y.js:22467-22478 placement
var Io = 480;
//@ chunk-x6v6jz2y.js:22478-22556 placement
function fullRepaintInterval(o) {
  return env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT ? Math.max(o, Io) : o;
}
//@ chunk-x6v6jz2y.js:22556-22851 placement
function useAnimationFrame(o = 16) {
  let r = Se(_T),
    [l, { isVisible: u }, d] = useTerminalViewport(),
    p = vye(),
    m = R(p),
    b = u;
  if (m.current !== p) ((m.current = p), (b = d()));
  let C = !!r && b && o !== null,
    h = o === null ? null : Math.ceil(fullRepaintInterval(o) / Xh) * Xh,
    k = R(0),
    x = yt(C ? r.subscribeKeepAlive : bTe, () =>
      C ? (k.current = Math.max(k.current, Math.floor(r.now() / h) * h)) : k.current,
    );
  return [l, x];
}
//@ chunk-x6v6jz2y.js:22851-22855 placement
j();
//@ chunk-x6v6jz2y.js:22855-22879 placement
var Bo = () => Se(kp),
  useApp = Bo;
//@ chunk-x6v6jz2y.js:22879-22883 placement
j();
//@ chunk-x6v6jz2y.js:22883-23169 placement = cleanupTaskOutput (0.67)
function useDebouncedCallback(o, r) {
  let l = Se(_T),
    u = R(o);
  u.current = o;
  let code = R(null),
    p = ce((b) => () => code.current?.(), []);
  yt(p, exr);
  let m = l?.setTimeout ?? $L;
  return Q(() => {
    let b = (...C) => {
      (code.current?.(),
        (code.current = m(() => {
          ((code.current = null), u.current(...C));
        }, r)));
    };
    return (
      (b.cancel = () => {
        (code.current?.(), (code.current = null));
      }),
      b
    );
  }, [m, r]);
}
//@ chunk-x6v6jz2y.js:23169-23173 placement
j();
//@ chunk-x6v6jz2y.js:23173-23191 placement
var et = () => () => {};
//@ chunk-x6v6jz2y.js:23191-23559 placement
function useFocus() {
  let { focusManager: focusManager, rootNode: rootNode } = Se(kp),
    l = yt(focusManager?.subscribe ?? et, () => focusManager?.activeElement ?? null);
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
        return !1;
      },
      focus: (u) => focusManager?.focus(u),
      blur: () => focusManager?.blur(),
      subscribe: focusManager?.subscribe ?? et,
    }),
    [l, focusManager, rootNode],
  );
}
//@ chunk-x6v6jz2y.js:23559-23563 placement
j();
//@ chunk-x6v6jz2y.js:23563-23581 placement
var Lo = () => () => {};
//@ chunk-x6v6jz2y.js:23581-23734 placement
function useHasFocus(o) {
  let { focusManager: focusManager } = Se(kp);
  return yt(
    focusManager?.subscribe ?? Lo,
    () => {
      let l = o.current,
        u = focusManager?.activeElement;
      if (!l || !u) return !1;
      return isDescendantOf(u, l);
    },
    () => !1,
  );
}
//@ chunk-x6v6jz2y.js:23734-23738 placement
j();
//@ chunk-x6v6jz2y.js:23738-23771 placement
function useInputClock() {
  return Se(InputNowContext) ?? Ho;
}
//@ chunk-x6v6jz2y.js:23771-23803 placement
function Ho() {
  return Date.now();
}
//@ chunk-x6v6jz2y.js:23803-23807 placement
j();
//@ chunk-x6v6jz2y.js:23807-24120 placement
function useAnimationTimer(o) {
  let r = Se(_T),
    l = o === null ? null : Math.ceil(fullRepaintInterval(o) / Xh) * Xh,
    u = R(null),
    d = Q(() => {
      if (!r || l === null) return bTe;
      return (p) =>
        r.subscribeFollower(() => {
          ((u.current = r.now()), p());
        });
    }, [r, l]);
  return yt(d, () => {
    if (!r || l === null) return ((u.current = null), 0);
    if (u.current === null) u.current = r.now();
    return Math.floor(u.current / l) * l;
  });
}
//@ chunk-x6v6jz2y.js:24120-24359 placement
function useInterval(o, r, l) {
  let u = R(o);
  u.current = o;
  let d = Se(_T),
    p = l?.immediate ?? !1,
    m = R(null),
    b = Q(
      () =>
        !d || r === null
          ? (C) => ((m.current = null), () => {})
          : (C) => {
              if (p && m.current === null) u.current();
              return ((m.current = r), startClockInterval(d, () => u.current(), r));
            },
      [d, r, p],
    );
  yt(b, exr);
}
//@ chunk-x6v6jz2y.js:24359-24495 placement
function startClockInterval(o, r, l) {
  let u = !1,
    d,
    p = () => {
      if (u) return;
      try {
        r();
      } finally {
        if (!u) d = o.setTimeout(p, l);
      }
    };
  return (
    (d = o.setTimeout(p, l)),
    () => {
      ((u = !0), d());
    }
  );
}
//@ chunk-x6v6jz2y.js:24495-24499 placement
j();
//@ chunk-x6v6jz2y.js:24499-24618 placement
function useMeasured(o) {
  let { subscribeLayout: subscribeLayout } = Se(kp),
    l = yt(subscribeLayout, o),
    [, u] = Uy((d) => d + 1, 0);
  return (
    zt(() => {
      if (!Object.is(o(), l)) u();
    }),
    l
  );
}
//@ chunk-x6v6jz2y.js:24618-24622 placement
j();
//@ chunk-x6v6jz2y.js:24622-24696 placement
function useFinePointer(o) {
  let { retainFinePointer: retainFinePointer } = Se(kp);
  P(() => (o ? retainFinePointer() : void 0), [o, retainFinePointer]);
}
//@ chunk-x6v6jz2y.js:24696-24700 placement
j();
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
  let r = 0,
    l = o;
  for (;;) {
    let parentNode = l.parentNode;
    if (!parentNode?.yogaNode || !l.yogaNode) return;
    r += l.yogaNode.getComputedTop();
    let parentNode_2 = parentNode.parentNode;
    if (
      parentNode_2?.yogaNode !== void 0 &&
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
function scrollAdjustedRow(o, r, l) {
  let { scrollTopRendered: scrollTopRendered, yogaNode: yogaNode } = r,
    p = o.yogaNode?.getComputedHeight();
  if (scrollTopRendered === void 0 || !yogaNode || !p) return;
  let computedBorder = yogaNode.getComputedBorder(1),
    b = yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3),
    C = computedBorder + yogaNode.getComputedPadding(1),
    h = b - yogaNode.getComputedPadding(3),
    k = l.top - scrollTopRendered,
    x = l.itemTop - scrollTopRendered,
    E = x + l.itemHeight <= C || x >= h,
    max = Math.max(k, computedBorder),
    min = Math.min(k + p, b);
  return E || max >= min ? null : { first: max - k, last: min - k - 1, of: p };
}
//@ chunk-x6v6jz2y.js:25742-26370 placement
function usePaintedRows(o, r) {
  let { subscribeFrames: subscribeFrames } = Se(kp),
    u = R(null),
    d = R({ rows: r, lastRows: void 0, contentRows: void 0 }),
    p = yt(
      ce((m) => (o ? subscribeFrames(m) : () => {}), [o, subscribeFrames]),
      ce(() => {
        if (!o) return;
        let m = u.current?.yogaNode?.getComputedHeight(),
          b = u.current?.childNodes.reduce((A, T) => A + (T.yogaNode?.getComputedHeight() ?? 0), 0),
          C = nodeRowRange(u.current),
          h = d.current,
          k =
            C === void 0 ||
            C === h.rows ||
            (!!C && !!h.rows && C.first === h.rows.first && C.last === h.rows.last && C.of === h.rows.of),
          x = m === void 0 ? void 0 : b;
        if (!(k && x === h.contentRows))
          d.current = { rows: k ? h.rows : C, lastRows: m || h.lastRows, contentRows: x };
        else if (m) h.lastRows = m;
        return d.current;
      }, [o]),
    );
  return [u, p?.rows, p?.lastRows, p?.contentRows];
}
//@ chunk-x6v6jz2y.js:26370-26374 placement
j();
/**
 * 选区操作钩子：复制（并清除）/复制不清除、取选中文本、清除、是否有选区、读状态、订阅变化、键盘移动焦点、设置选区背景色。没有 Ink 实例时返回空实现。
 */
//@ chunk-x6v6jz2y.js:26374-27033 placement = useSelection (0.958)
function useSelection() {
  Se(StdinContextAlias);
  let ink = di().get(process.stdout);
  return Q(() => {
    if (!ink)
      return {
        copySelection: () => "",
        copySelectionNoClear: () => "",
        getSelectedText: () => "",
        clearSelection: () => {},
        hasSelection: () => !1,
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
