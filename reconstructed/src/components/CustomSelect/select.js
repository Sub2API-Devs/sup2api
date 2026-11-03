/**
 * components/CustomSelect/select.tsx
 *
 * 通用 Select 组件：单选列表，布局 compact/compact-vertical/expanded、数字快捷键、可输入选项、描述两栏、分页视口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select.tsx
 * pieces: chunk-8jypjjdf.js (2), chunk-ag5x7vhf.js (1), chunk-ey2qag4x.js (16), chunk-r68xwcze.js (44)
 * attribution: placement 50, fingerprint 4, layout 8, file-local 1
 */
import { j, y, R, P, Oo, qt, Se, yt, Fy, zt, dh } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import { WDe, USER_MESSAGE_BACKGROUND, Select, WindowedText, useHoverHighlight } from "./selectTypeahead.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { UP_ARROW, DOWN_ARROW, ups } from "../../utils/permissions/autoModeRulesPrompt.js";
import { AlternateScreenContext } from "../../ink/components/AlternateScreen.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { _S } from "../../../vendor/chart.js/dist/chart.js";
import { NoSelect, useHasFocus, useFocus, useMeasured } from "../../ink/components/Input.js";
import { Decorative, useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { clamp } from "../../ink/screen.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useLatestState } from "./option-map.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { $V, NV } from "../design-system/ScrollColumn.js";
import { ContextSlotA, u0t } from "../../context/contextSlots.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { ListItem } from "../design-system/ListItem.js";
import { Te, we } from "./selectTable.js";
import { StatusIcon, Qmt } from "../design-system/StatusIcon.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { reactNodeText } from "../../utils/reactText.js";
import { hitTest } from "../../ink/hit-test.js";
import { useSelectState_2 } from "./use-select-state.js";
import { count } from "../../utils/collections.js";
import { useSelectInput, usePasteIntoInputOption } from "./use-select-input.js";
import { OverflowHint } from "../CtrlOToExpand.js";
import { SelectInputOption } from "./select-input-option.js";
import { SelectOption } from "./select-option.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { truncateToWidth } from "../../utils/format.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Me } from "../design-system/ThemeProvider.js";
import {
  markAutoDefaultNoticeSeen,
  AUTO_MODE_DEFAULT,
  AUTO_DEFAULT_NOTICE_TITLE,
  AUTO_DEFAULT_NOTICE_BODY,
  AUTO_DEFAULT_NOTICE_URL,
} from "../LogoV2/AutoModeDefaultNotice.js";
import { at } from "../LogoV2/CondensedLogo.js";

//@ chunk-r68xwcze.js:1089-1093 placement
j();
//@ chunk-r68xwcze.js:1093-1097 placement
j();
//@ chunk-r68xwcze.js:1097-1101 placement
j();
//@ chunk-r68xwcze.js:1101-1105 placement
j();
//@ chunk-r68xwcze.js:1105-1134 placement
var MULTI_CLICK_MIN_MS = 150,
  MULTI_CLICK_MAX_MS_2 = 400,
  CLICK_TIME_SLOP_MS = 60,
  CLICK_CELL_SLOP = 1;
//@ chunk-r68xwcze.js:1134-1211 placement = comparePoints (0.803)
function isNearPoint(a, b) {
  return Math.abs(b.col - a.col) <= CLICK_CELL_SLOP && Math.abs(b.row - a.row) <= CLICK_CELL_SLOP;
}
//@ chunk-r68xwcze.js:1211-2584 placement
function ScrollArrowButton({
  children: children,
  paddingX: paddingX = 0,
  onPress: onPress,
  repeat: repeat = !1,
}) {
  let f = useClock(),
    m = useStrayClickGuard(),
    l = WDe(),
    [C, h] = y(!1),
    [A, T] = y(!1),
    k = R(null),
    [M, E] = y(null),
    F = R(null);
  P(() => () => F.current?.(), []);
  let B = onPress !== void 0;
  if (!B && (C || A || M !== null)) (h(!1), T(!1), E(null));
  P(() => {
    if (!B) k.current = null;
  }, [B]);
  let N = Oo((x) => {
    let I = k.current;
    if (I !== x) return;
    ((I.hasActed = !0), onPress?.({ row: I.row }));
  });
  P(() => {
    if (M === null) return;
    let x = f.setTimeout(function I() {
      (N(M), (x = f.setTimeout(I, CLICK_TIME_SLOP_MS)));
    }, MULTI_CLICK_MAX_MS_2);
    return () => x();
  }, [M, f]);
  function U(x) {
    if ((x.stopImmediatePropagation(), F.current !== null || m(x))) return;
    (x.endClickChain(),
      T(!0),
      (F.current = f.setTimeout(() => {
        ((F.current = null), T(!1), onPress?.(x));
      }, MULTI_CLICK_MIN_MS)));
  }
  function W(x) {
    if (x.type === "down" && x.button === 0) {
      let I = { col: x.col, row: x.row, hasActed: !1 };
      ((k.current = I), T(!0), E(I));
    } else if (x.type === "up") {
      let I = k.current;
      if (
        ((k.current = null),
        T(!1),
        E(null),
        I !== null && !I.hasActed && !x.isUnreported && isNearPoint(I, x))
      )
        onPress?.({ row: I.row });
    }
  }
  let L = l === "inverse",
    H = L ? void 0 : A ? "text" : C ? USER_MESSAGE_BACKGROUND : void 0,
    [G = "", ...g] = children;
  return r(Box, {
    paddingLeft: paddingX,
    flexShrink: 1,
    alignSelf: "flex-start",
    backgroundColor: H,
    onClick: B && !repeat ? U : void 0,
    onPointer: B && repeat ? W : void 0,
    onMouseEnter: B ? () => h(!0) : void 0,
    onMouseLeave: B ? () => h(!1) : void 0,
    hoverFollowsPaint: B,
    noSelect: !0,
    children: [
      e(Text, {
        color: A && !L ? "inverseText" : void 0,
        dimColor: !A,
        inverse: A && L,
        wrap: "truncate-end",
        children:
          C && !A && L
            ? r(Fragment, { children: [e(Text, { inverse: !0, children: G }), g.join("")] })
            : children,
      }),
      paddingX > 0 && B && e(Box, { width: paddingX, flexShrink: 1000 }),
    ],
  });
}
//@ chunk-r68xwcze.js:2584-2596 placement
var Yo = 1000;
//@ chunk-r68xwcze.js:2596-2877 placement
function useStrayClickFilter() {
  let t = w(2),
    o = useClock(),
    i;
  if (t[0] !== o)
    ((i = () => {
      let a = { at: Number.NEGATIVE_INFINITY, row: -1 };
      return {
        pressed: (f) => {
          a = { at: o.now(), row: f.row };
        },
        dropsClick: (m) => {
          if (m.row !== a.row || o.now() - a.at >= Yo) {
            return !1;
          }
          return (m.dropAsStray(), !0);
        },
      };
    }),
      (t[0] = o),
      (t[1] = i));
  else i = t[1];
  let [l] = y(i);
  return l;
}
//@ chunk-r68xwcze.js:2877-2896 placement
var knn = qt(() => !1);
//@ chunk-r68xwcze.js:2896-3162 placement
function MoreItemsIndicator(o) {
  let l = w(3),
    { direction: direction, count: count, onPress: onPress } = o;
  if (count <= 0) {
    return null;
  }
  const m = `${direction === "above" ? UP_ARROW : DOWN_ARROW} ${count} more`;
  let C;
  if (l[0] !== onPress || l[1] !== m)
    ((C = e(Box, {
      paddingLeft: 1,
      children: e(ScrollArrowButton, { paddingX: 1, onPress: onPress, children: m }),
    })),
      (l[0] = onPress),
      (l[1] = m),
      (l[2] = C));
  else C = l[2];
  return C;
}
//@ chunk-r68xwcze.js:3162-3166 placement
j();
//@ chunk-r68xwcze.js:3166-3170 placement
j();
//@ chunk-r68xwcze.js:3170-3270 placement
function useHoverTrackingEnabled() {
  let o = Se(AlternateScreenContext),
    { subscribeHoverTracked: subscribeHoverTracked, isHoverTracked: isHoverTracked } = Se(kp),
    a = yt(subscribeHoverTracked, isHoverTracked);
  return o ?? a;
}
//@ chunk-r68xwcze.js:3270-3274 placement
j();
//@ chunk-r68xwcze.js:3274-3283 placement
var Jo = 5;
/**
 * 列表滚动条（偏移、可见数、点击/拖动滚动）。
 */
//@ chunk-r68xwcze.js:3283-6052 placement
function ScrollBar(o) {
  let N = w(50),
    {
      offset: offset,
      visible: visible,
      total: total,
      height: height,
      onScrollTo: onScrollTo,
      onScrollBy: onScrollBy,
      arrows: arrows,
    } = o,
    h = height === void 0 ? visible : height,
    A = arrows === void 0 ? !1 : arrows,
    T = R(null),
    [k, M] = y(!1),
    [E, F] = y(!1),
    B = onScrollTo !== void 0,
    U,
    W;
  if (N[0] !== B)
    ((U = () => {
      if (!B && T.current !== null && T.current.jump !== null) T.current = null;
    }),
      (W = [B]),
      (N[0] = B),
      (N[1] = U),
      (N[2] = W));
  else ((U = N[1]), (W = N[2]));
  if ((P(U, W), total <= visible || h < 1)) {
    return null;
  }
  let L = A && h >= Jo,
    H = L ? h - 2 : h,
    G;
  if (N[3] !== H || N[4] !== offset || N[5] !== total || N[6] !== visible)
    ((G = computeScrollThumb({ offset: offset, visible: visible, total: total, height: H })),
      (N[3] = H),
      (N[4] = offset),
      (N[5] = total),
      (N[6] = visible),
      (N[7] = G));
  else G = N[7];
  let { top: top, size: size } = G,
    I = H - top - size,
    V;
  if (
    N[8] !== H ||
    N[9] !== offset ||
    N[10] !== onScrollTo ||
    N[11] !== size ||
    N[12] !== top ||
    N[13] !== total ||
    N[14] !== visible
  ) {
    V = function V(p) {
      let b = T.current;
      if (p.type === "up") {
        if (
          ((T.current = null),
          M(!1),
          b !== null && b.jump !== null && !p.isUnreported && isNearPoint(b.jump, p))
        )
          K({ ...b, asked: offset }, p.row, !1);
        return;
      }
      if (p.type === "down" && p.button === 0) {
        let ee = p.localRow >= top && p.localRow < top + size;
        let q = {
          trackRow: p.row - p.localRow,
          visible: visible,
          total: total,
          height: H,
          grab: ee ? p.localRow - top : Math.floor(size / 2),
          asked: offset,
          jump: ee ? null : { col: p.col, row: p.row },
        };
        if (((T.current = q), M(!0), ee)) K(q, p.row, !0);
        return;
      }
      if (b === null) {
        return;
      }
      if (b.jump !== null) {
        if (Math.abs(p.row - b.jump.row) <= CLICK_CELL_SLOP) {
          return;
        }
        b.jump = null;
      }
      K(b, p.row, !1);
    };
    function K(D, J, oe) {
      let d = scrollOffsetFromThumbTop({
        top: J - D.trackRow - D.grab,
        visible: D.visible,
        total: D.total,
        height: D.height,
      });
      let v = d >= D.total - D.visible ? D.total - Math.min(D.visible, visible) : d;
      if (v === D.asked) {
        return;
      }
      if (((D.asked = v), !oe)) onScrollTo?.(v);
    }
    ((N[8] = H),
      (N[9] = offset),
      (N[10] = onScrollTo),
      (N[11] = size),
      (N[12] = top),
      (N[13] = total),
      (N[14] = visible),
      (N[15] = V));
  } else V = N[15];
  let u = E || k ? "suggestion" : void 0,
    re;
  if (N[16] !== L || N[17] !== offset || N[18] !== onScrollBy)
    ((re =
      L &&
      e(ScrollArrowButton, {
        repeat: !0,
        onPress: onScrollBy && offset > 0 ? () => onScrollBy(-1) : void 0,
        children: UP_ARROW,
      })),
      (N[16] = L),
      (N[17] = offset),
      (N[18] = onScrollBy),
      (N[19] = re));
  else re = N[19];
  const ne = onScrollTo || k ? V : void 0;
  let Y;
  if (N[20] !== onScrollTo) ((Y = onScrollTo && (() => F(!0))), (N[20] = onScrollTo), (N[21] = Y));
  else Y = N[21];
  let _;
  if (N[22] !== onScrollTo) ((_ = onScrollTo && (() => F(!1))), (N[22] = onScrollTo), (N[23] = _));
  else _ = N[23];
  let X;
  if (N[24] !== top)
    ((X = top > 0 && e(Text, { dimColor: !0, children: Ee(_S.pipe, top) })), (N[24] = top), (N[25] = X));
  else X = N[25];
  let te;
  if (N[26] !== size) ((te = Ee(ups, size)), (N[26] = size), (N[27] = te));
  else te = N[27];
  let ce;
  if (N[28] !== te || N[29] !== u)
    ((ce = e(Text, { color: u, children: te })), (N[28] = te), (N[29] = u), (N[30] = ce));
  else ce = N[30];
  let Q;
  if (N[31] !== I)
    ((Q = I > 0 && e(Text, { dimColor: !0, children: Ee(_S.pipe, I) })), (N[31] = I), (N[32] = Q));
  else Q = N[32];
  let he;
  if (N[33] !== X || N[34] !== ce || N[35] !== Q || N[36] !== ne || N[37] !== Y || N[38] !== _)
    ((he = r(NoSelect, {
      flexDirection: "column",
      flexShrink: 0,
      onPointer: ne,
      onMouseEnter: Y,
      onMouseLeave: _,
      children: [X, ce, Q],
    })),
      (N[33] = X),
      (N[34] = ce),
      (N[35] = Q),
      (N[36] = ne),
      (N[37] = Y),
      (N[38] = _),
      (N[39] = he));
  else he = N[39];
  let be;
  if (N[40] !== L || N[41] !== offset || N[42] !== onScrollBy || N[43] !== total || N[44] !== visible)
    ((be =
      L &&
      e(ScrollArrowButton, {
        repeat: !0,
        onPress: onScrollBy && offset < total - visible ? () => onScrollBy(1) : void 0,
        children: DOWN_ARROW,
      })),
      (N[40] = L),
      (N[41] = offset),
      (N[42] = onScrollBy),
      (N[43] = total),
      (N[44] = visible),
      (N[45] = be));
  else be = N[45];
  let Re;
  if (N[46] !== he || N[47] !== be || N[48] !== re)
    ((Re = e(Decorative, {
      children: r(Box, { flexDirection: "column", flexShrink: 0, children: [re, he, be] }),
    })),
      (N[46] = he),
      (N[47] = be),
      (N[48] = re),
      (N[49] = Re));
  else Re = N[49];
  return Re;
}
//@ chunk-r68xwcze.js:6052-6302 placement
function computeScrollThumb({ offset: offset, visible: visible, total: total, height: height }) {
  let f = clamp(Math.round((visible / total) * height), 1, Math.max(1, height - 1)),
    m = height - f,
    l = total - visible;
  if (offset <= 0) return { top: 0, size: f };
  if (offset >= l) return { top: m, size: f };
  let rounded = Math.round((offset / l) * m);
  if (m < 2) return { top: rounded, size: f };
  return { top: clamp(rounded, 1, m - 1), size: f };
}
//@ chunk-r68xwcze.js:6302-6509 placement
function scrollOffsetFromThumbTop({ top: top, visible: visible, total: total, height: height }) {
  let { size: size } = computeScrollThumb({ offset: 0, visible: visible, total: total, height: height }),
    m = height - size,
    l = total - visible;
  if (top <= 0) return 0;
  if (top >= m) return l;
  let rounded = Math.round((top / m) * l);
  if (l < 2) return rounded;
  return clamp(rounded, 1, l - 1);
}
//@ chunk-r68xwcze.js:6509-6572 placement
function Ee(o, t) {
  return Array.from({ length: t }, () => o).join(`
`);
}
//@ chunk-r68xwcze.js:6572-7150 placement
function SelectRow(o) {
  let h = w(12),
    { bar: bar, height: height, children: children } = o,
    [f, m] = y(!1),
    l = useHoverTrackingEnabled();
  if (f && !l) m(!1);
  let C = l && bar.total > bar.visible,
    A,
    T;
  if (h[0] === MEMO_CACHE_SENTINEL) ((A = () => m(!0)), (T = () => m(!1)), (h[0] = A), (h[1] = T));
  else ((A = h[0]), (T = h[1]));
  let k;
  if (h[2] !== children)
    ((k = e(Box, { flexDirection: "column", flexGrow: 1, children: children })),
      (h[2] = children),
      (h[3] = k));
  else k = h[3];
  let M;
  if (h[4] !== bar || h[5] !== C || h[6] !== height || h[7] !== f)
    ((M = C && (f ? e(ScrollBar, { ...bar, height: height }) : e(Box, { width: 1, flexShrink: 0 }))),
      (h[4] = bar),
      (h[5] = C),
      (h[6] = height),
      (h[7] = f),
      (h[8] = M));
  else M = h[8];
  let E;
  if (h[9] !== k || h[10] !== M)
    ((E = r(Box, { gap: 1, onMouseEnter: A, onMouseLeave: T, children: [k, M] })),
      (h[9] = k),
      (h[10] = M),
      (h[11] = E));
  else E = h[11];
  return E;
}
//@ chunk-r68xwcze.js:7150-7154 placement
j();
//@ chunk-r68xwcze.js:7154-7158 placement
j();
/**
 * 按聚焦下标、总数、窗口高度（及可选锚点）算可见窗口 [windowStart, windowEnd) 以及上下各隐藏多少项。
 */
//@ chunk-r68xwcze.js:7158-7320 placement
function computeScrollWindow(o, t, i, a = null) {
  let f = clamp(a === null ? o - i + 1 : clamp(a, o - i + 1, o), 0, Math.max(0, t - i)),
    min = Math.min(f + i, t);
  return { windowStart: f, windowEnd: min, moreAbove: f, moreBelow: t - min };
}
//@ chunk-r68xwcze.js:7320-7335 placement
var ct = new Set();
//@ chunk-r68xwcze.js:7335-9252 placement
function useLineScroll({
  lineCount: lineCount,
  visibleCount: visibleCount,
  cursorLine: cursorLine,
  getCursorLine: getCursorLine,
  headings: headings = ct,
  boundaries: boundaries,
  markerLines: markerLines = 0,
  onScroll: onScroll,
}) {
  let max = Math.max(0, lineCount - 1),
    A = clamp(cursorLine, 0, max),
    T = () => clamp(getCursorLine(), 0, max),
    [k, M, E] = useLatestState(null),
    F = visibleCount + 2 * markerLines,
    B = 0;
  while (B < lineCount && headings.has(B)) B++;
  let N = lineCount - 1;
  while (N >= 0 && headings.has(N)) N--;
  function U(d, v) {
    return (d > B ? markerLines : 0) + (v <= N ? markerLines : 0);
  }
  function W(d) {
    return d <= 0 || d >= lineCount || boundaries === void 0 || boundaries.has(d) || headings.has(d);
  }
  function L(d) {
    let min = Math.min(d + 1, lineCount);
    while (!W(min)) min++;
    return min;
  }
  function H(d) {
    return W(d) && !(d > B && d <= B + markerLines);
  }
  function G(d, v) {
    let u = d + v;
    while (u > 0 && u < lineCount && !H(u)) u += v;
    return clamp(u, 0, lineCount);
  }
  function g(d) {
    for (let min = Math.min(d + F, lineCount); min > d; min--)
      if (W(min) && min - d + U(d, min) <= F) return min;
    return L(d);
  }
  let x = 0;
  for (let d = lineCount - 1; d >= 0; d--)
    if (H(d) && g(d) < lineCount) {
      x = G(d, 1);
      break;
    }
  function I(d) {
    let v = g(d);
    return headings.has(v - 1) && v < lineCount;
  }
  function V(d) {
    let v = g(d);
    for (let u = d; u < v; u++) if (!headings.has(u)) return !0;
    return !1;
  }
  function p(d, v) {
    let u = d;
    while (!W(u)) u--;
    let re = L(u),
      ne = re > N ? lineCount : re,
      min = Math.min(u, x);
    while (!H(min)) min--;
    let _ = u <= B ? 0 : min;
    while (_ < min && g(_) < re) _ = G(_, 1);
    let min_2 = Math.min(min, Math.max(0, ne - F));
    while (min_2 < min && (!H(min_2) || g(min_2) < ne)) min_2++;
    let te = clamp(v ?? min_2, Math.min(min_2, _), _);
    while (!H(te)) te--;
    if (v !== null && v > u)
      for (let ce = G(te, -1); ce < te && g(ce) >= ne && (headings.has(te - 1) || I(te)); ce = G(ce, -1))
        te = ce;
    return te;
  }
  let b = p(A, k),
    K = g(b);
  P(() => {
    if (k !== null && k !== b) M(b);
  }, [k, b, M]);
  function ee(d) {
    let v = p(T(), E()),
      u = clamp(d, 0, x);
    while (!H(u)) u--;
    let re = u < v ? -1 : 1;
    while (
      u !== v &&
      u > 0 &&
      u < x &&
      ((headings.has(u - 1) && (re < 0 || !headings.has(u))) || I(u) || !V(u))
    )
      u = G(u, re);
    let ne = V(u) ? u : v;
    M(ne);
    let Y = ne,
      _ = g(ne);
    while (Y < _ && p(Y, ne) !== ne) Y++;
    while (_ > Y && p(_ - 1, ne) !== ne) _--;
    onScroll?.(Y, _);
  }
  function q(d) {
    let v = p(T(), E());
    for (let u = 0; u < Math.abs(d); u++) v = G(v, d < 0 ? -1 : 1);
    if (d !== 0) ee(v);
  }
  let D = K - b >= lineCount,
    J = D ? 0 : Math.max(0, F - U(b, K) - K + b),
    oe = K - b + J;
  return {
    windowStart: b,
    windowEnd: K,
    spareLines: J,
    fits: D,
    getWindow: () => {
      let d = p(T(), E());
      return { windowStart: d, windowEnd: g(d) };
    },
    scrollBy: q,
    scrollTo: ee,
    pin: () => M(p(T(), E())),
    bar: {
      offset: b,
      visible: oe,
      total: lineCount,
      onScrollTo: D ? void 0 : (d) => ee(d + oe >= lineCount ? x : d),
      onScrollBy: D ? void 0 : q,
    },
  };
}
/**
 * 管理选择列表光标、可见窗口、行高与分组标题。
 */
//@ chunk-r68xwcze.js:9252-12200 placement
function useSelectCursor({
  count: count,
  visibleCount: visibleCount,
  headingLines: headingLines,
  rowHeights: rowHeights,
  moreRowLines: moreRowLines = !1,
  rowKeys: rowKeys,
  resetKey: resetKey,
  initialCursor: initialCursor = 0,
  isDisabled: isDisabled = !1,
  onAccept: onAccept,
  onRowKeyDown: onRowKeyDown,
  onCursorChange: onCursorChange,
  edge: edge = "clamp",
  onUpFromFirstItem: onUpFromFirstItem,
  onDownFromLastItem: onDownFromLastItem,
  declineHomeEnd: declineHomeEnd = !1,
  keybindingContext: keybindingContext = "Select",
}) {
  let U = R(null),
    max = Math.max(0, count - 1),
    [L, H, G] = useLatestState(() => {
      let c = clamp(initialCursor, 0, max);
      return { index: c, key: rowKeys?.[c], resetKey: resetKey };
    }),
    g = useHasFocus(U),
    { focusDirection: focusDirection } = useFocus(),
    I = c9(isDisabled);
  function V(c) {
    if (!Object.is(c.resetKey, resetKey)) return 0;
    let O = clamp(c.index, 0, max);
    if (c.key === void 0 || rowKeys?.[O] === c.key) return O;
    let le = rowKeys?.indexOf(c.key) ?? -1;
    return le < 0 ? O : le;
  }
  let p = V(L);
  function b() {
    return V(G());
  }
  function K(c) {
    H((O) =>
      O.index === c && O.key === rowKeys?.[c] && Object.is(O.resetKey, resetKey)
        ? O
        : { index: c, key: rowKeys?.[c], resetKey: resetKey },
    );
  }
  let ee = new Set(headingLines),
    size = ee.size;
  for (let c = 0; c < count; c++) size += rowHeights?.[c] ?? 1;
  let D = [],
    J = [0],
    oe = new Set();
  for (let c = 0, O = 0; c < size; c++) {
    if (c >= O) {
      if ((oe.add(c), !ee.has(c))) ((O = c + (rowHeights?.[D.length] ?? 1)), D.push(c));
    }
    J.push(D.length);
  }
  let d = moreRowLines ? 1 : 0;
  function v(c) {
    X((O) => {
      let le = O + c;
      if (edge === "wrap" && count > 0) return ((le % count) + count) % count;
      return clamp(le, 0, max);
    });
  }
  function u(c) {
    if (Q.fits) return !1;
    if (visibleCount === 1) {
      v(c);
      return;
    }
    X((O) => {
      let le = Q.getWindow(),
        ue = clamp((D[O] ?? 0) + c * (le.windowEnd - le.windowStart), 0, size - 1);
      while (!oe.has(ue)) ue--;
      return clamp(c > 0 ? Math.max((J[ue + 1] ?? 0) - 1, O + 1) : Math.min(J[ue] ?? 0, O - 1), 0, max);
    });
  }
  function re(c) {
    if (b() === (c < 0 ? 0 : max)) {
      let O = c < 0 ? onUpFromFirstItem : onDownFromLastItem;
      if (O) {
        O();
        return;
      }
      if (edge !== "wrap" && focusDirection(c < 0 ? "up" : "down")) return;
    }
    v(c);
  }
  function ne(c) {
    if (declineHomeEnd && Q.fits) return !1;
    X(c);
  }
  P(() => {
    if (G() === L) K(p);
  });
  let Y = Oo((c) => onCursorChange?.(c)),
    _ = R(null);
  P(() => {
    if (count === 0) {
      _.current = null;
      return;
    }
    if (_.current !== p) ((_.current = p), Y(p));
  }, [p, count]);
  function X(c) {
    let O = clamp(typeof c === "function" ? c(b()) : c, 0, max);
    if ((K(O), count === 0 || O === _.current)) return;
    ((_.current = O), onCursorChange?.(O));
  }
  (MessageActionsKeybindings(
    xr(
      {
        "select:next": () => re(1),
        "select:previous": () => re(-1),
        "select:pageDown": () => u(1),
        "select:pageUp": () => u(-1),
        "select:first": () => ne(0),
        "select:last": () => ne(max),
      },
      (c) => () => (c9(isDisabled) ? !1 : c()),
    ),
    { context: keybindingContext, isActive: g && !I && count > 0 },
  ),
    MessageActionsKeybindings(
      { "select:accept": () => (c9(isDisabled) ? !1 : onAccept?.(b())) },
      { context: keybindingContext, isActive: g && !I && count > 0 && onAccept !== void 0 },
    ));
  let te = useKeybindingContext() !== null;
  function ce(c) {
    if (c9(isDisabled) || count === 0) return;
    let O = b();
    if (c.key === "return" && onAccept && !te) {
      (onAccept(O), c.preventDefault(), c.stopImmediatePropagation());
      return;
    }
    onRowKeyDown?.(c, O);
  }
  let Q = useLineScroll({
    lineCount: size,
    visibleCount: visibleCount,
    cursorLine: D[p] ?? 0,
    getCursorLine: () => D[b()] ?? 0,
    headings: ee,
    boundaries: oe,
    markerLines: d,
    onScroll: (c, O) => {
      let le = b(),
        ue = J[c] ?? 0,
        _e = (J[O] ?? count) - 1;
      X(ue > _e ? le : clamp(le, ue, _e));
    },
  });
  function he(c) {
    if (c.deltaY === 0 || c9(isDisabled)) return;
    (Q.scrollBy(c.deltaY > 0 ? 1 : -1), c.stopImmediatePropagation());
  }
  function be(c, O = !1) {
    if (!O && c9(isDisabled)) return;
    Q.scrollTo(c < 0 ? 0 : size);
  }
  function Re(c) {
    (Q.pin(), X(clamp(c, 0, max)));
  }
  return {
    cursor: p,
    windowStart: Q.windowStart,
    windowEnd: Q.windowEnd,
    spareLines: Q.spareLines,
    moreAbove: J[Q.windowStart] ?? 0,
    moreBelow: count - (J[Q.windowEnd] ?? count),
    isCursor: (c) => c === p && count > 0,
    hasFocus: g,
    scrollBar: {
      ...Q.bar,
      onScrollTo: I ? void 0 : Q.bar.onScrollTo,
      onScrollBy: I ? void 0 : Q.bar.onScrollBy,
    },
    setCursor: Re,
    scrollToEdge: be,
    containerRef: U,
    bind: { ref: U, tabIndex: 0, onKeyDown: ce, onWheel: !I && !Q.fits ? he : void 0 },
  };
}
//@ chunk-r68xwcze.js:12200-12255 placement
function c9(o) {
  return typeof o === "function" ? o() : o === !0;
}
//@ chunk-r68xwcze.js:12255-12296 placement
function St(N, U) {
  return { label: N, value: U };
}
//@ chunk-r68xwcze.js:12296-12326 placement
function kt(ne, Y) {
  return ne + Y;
}
//@ chunk-r68xwcze.js:12326-12350 placement
var qe = 3,
  mn = 7,
  Eo = qt(!1);
//@ chunk-r68xwcze.js:12350-12378 placement
function pM() {
  return Se(Eo);
}
//@ chunk-r68xwcze.js:12378-13751 placement
function SelectGroup(o) {
  let f = w(27),
    t = useIsScreenReaderEnabled(),
    { onFocus: onFocus, onSelect: onSelect } = o;
  if (t && onSelect !== void 0) {
    let m, l;
    if (f[0] !== o.children) {
      l = [];
      m = new Map();
      for (const C of Fy.toArray(o.children)) {
        if (!Be(C)) {
          l.push(C);
          continue;
        }
        m.set(l.length, [...(m.get(l.length) ?? []), C]);
      }
      ((f[0] = o.children), (f[1] = m), (f[2] = l));
    } else ((m = f[1]), (l = f[2]));
    if (l.length === 0) {
      let h;
      if (f[3] !== o.emptyMessage)
        ((h = o.emptyMessage ? e(Text, { children: o.emptyMessage }) : null),
          (f[3] = o.emptyMessage),
          (f[4] = h));
      else h = f[4];
      return h;
    }
    let h;
    if (f[5] !== o.isDisabled)
      ((h = (A) => {
        if (c9(o.isDisabled) || A.ctrl || A.meta) {
          return;
        }
        if (A.key === "return" || A.key === " ") A.stopPropagation();
      }),
        (f[5] = o.isDisabled),
        (f[6] = h));
    else h = f[6];
    let T;
    if (f[7] !== l) ((T = l.map(St)), (f[7] = l), (f[8] = T));
    else T = f[8];
    let k;
    if (f[9] !== o.isDisabled) ((k = c9(o.isDisabled)), (f[9] = o.isDisabled), (f[10] = k));
    else k = f[10];
    let M;
    if (f[11] !== onFocus || f[12] !== onSelect)
      ((M = (E) => {
        (onFocus?.(E), onSelect(E));
      }),
        (f[11] = onFocus),
        (f[12] = onSelect),
        (f[13] = M));
    else M = f[13];
    let F;
    if (f[14] !== m || f[15] !== onFocus || f[16] !== T || f[17] !== k || f[18] !== M)
      ((F = e(Select, {
        options: T,
        headings: m,
        drawLabels: !0,
        isDisabled: k,
        onFocus: onFocus,
        onChange: M,
      })),
        (f[14] = m),
        (f[15] = onFocus),
        (f[16] = T),
        (f[17] = k),
        (f[18] = M),
        (f[19] = F));
    else F = f[19];
    let B;
    if (f[20] !== h || f[21] !== F)
      ((B = e(Box, { flexDirection: "column", onKeyDown: h, children: F })),
        (f[20] = h),
        (f[21] = F),
        (f[22] = B));
    else B = f[22];
    return B;
  }
  if (o.visibleCount === void 0) {
    let h;
    if (f[23] !== o) ((h = e(SelectContainer, { ...o })), (f[23] = o), (f[24] = h));
    else h = f[24];
    return h;
  }
  let h;
  if (f[25] !== o)
    ((h = e(useSelectState, { props: o, visibleCount: o.visibleCount })), (f[25] = o), (f[26] = h));
  else h = f[26];
  return h;
}
//@ chunk-r68xwcze.js:13751-15571 placement
function SelectContainer(o) {
  let h = w(21),
    t = $V(),
    i = Se(ContextSlotA),
    a = useTerminalSize(),
    { rows: rows } = useScrollViewportSize(a),
    m = Tl(),
    l = i !== null && !m,
    C = R(null),
    A;
  if (h[0] !== l || h[1] !== t)
    ((A = () => {
      let T = C.current;
      if (T === null) {
        return null;
      }
      let k = t?.box.current ?? T;
      while (t === null && !l && k.parentNode !== void 0) k = k.parentNode;
      return measureElement(k).height - measureElement(T).height;
    }),
      (h[0] = l),
      (h[1] = t),
      (h[2] = A));
  else A = h[2];
  let M = useMeasured(A),
    E;
  if (h[3] !== i || h[4] !== t?.box.current)
    ((E = () => {
      let F = t?.box.current ?? C.current;
      let B = i === null ? null : i();
      return F === null || B === null ? null : B + measureElement(F).height;
    }),
      (h[3] = i),
      (h[4] = t?.box.current),
      (h[5] = E));
  else E = h[5];
  let N = useMeasured(E),
    U = Se(u0t),
    W;
  if (h[6] !== o.children || h[7] !== o.emptyMessage) {
    let toArray = Fy.toArray(o.children);
    W = toArray.every(Be) ? Number(Boolean(o.emptyMessage)) : toArray.map(Bo).reduce(kt, 0);
    ((h[6] = o.children), (h[7] = o.emptyMessage), (h[8] = W));
  } else W = h[8];
  let H = W,
    G = o.maxVisibleCount === void 0 ? H : Math.min(H, o.maxVisibleCount),
    g,
    x;
  if (h[9] !== U || h[10] !== l || h[11] !== G)
    ((g = () =>
      l ? U?.({ rows: () => (C.current === null ? G : measureElement(C.current).height), owed: G }) : void 0),
      (x = [l, U, G]),
      (h[9] = U),
      (h[10] = l),
      (h[11] = G),
      (h[12] = g),
      (h[13] = x));
  else ((g = h[12]), (x = h[13]));
  zt(g, x);
  let I;
  if (h[14] === MEMO_CACHE_SENTINEL)
    ((I = () => (C.current === null ? 0 : measureElement(C.current).width)), (h[14] = I));
  else I = h[14];
  let V = useMeasured(I),
    [p, b] = y(null),
    K = m ? (t?.rows ?? rows) : a.rows,
    ee = p?.rows === K && p.width === V;
  if (M !== null && (p === null || !ee || M > p.chrome)) b({ rows: K, width: V, chrome: M });
  let q = ee ? Math.max(p.chrome, M ?? p.chrome) : M,
    D = m ? K : l ? N : a.rows - (t?.reserve ?? NV),
    J =
      q === null || D === null ? qe : m || l ? D - q : Math.min(Math.max(mn, Math.floor(a.rows / 2)), D - q),
    oe = o.maxVisibleCount === void 0 ? J : Math.min(J, o.maxVisibleCount),
    max = Math.max(1, oe),
    v =
      max === 1
        ? "none"
        : max < qe && o.overflowHint !== "none"
          ? "glyph"
          : o.overflowHint === "count"
            ? void 0
            : o.overflowHint,
    u;
  if (h[15] !== v || h[16] !== o) ((u = { ...o, overflowHint: v }), (h[15] = v), (h[16] = o), (h[17] = u));
  else u = h[17];
  let re;
  if (h[18] !== max || h[19] !== u)
    ((re = e(Box, {
      ref: C,
      flexDirection: "column",
      children: e(useSelectState, { props: u, visibleCount: max }),
    })),
      (h[18] = max),
      (h[19] = u),
      (h[20] = re));
  else re = h[20];
  return re;
}
/**
 * 选择列表的状态与按键处理（默认焦点、禁用项、选择）。
 */
//@ chunk-r68xwcze.js:15571-18622 placement
function useSelectState({
  props: {
    children: o,
    defaultFocusIndex: t,
    resetKey: i,
    onSelect: a,
    onFocus: f,
    onRowKeyDown: m,
    isDisabled: l,
    onDisabledRowClick: C,
    wrap: h = !1,
    onUpFromFirstItem: A,
    onDownFromLastItem: T,
    declineHomeEnd: k = !1,
    keybindingContext: M,
    overflowHint: E,
    scrollBar: F = !0,
    emptyMessage: B,
    hoverStyle: N,
    rowClick: U = "select",
    styled: W = !1,
  },
  visibleCount: visibleCount,
}) {
  let toArray = Fy.toArray(o),
    G = [],
    g = 0;
  for (let z of toArray) (G.push(Bo(z)), (g += G.at(-1) ?? 1));
  let x = E === void 0 && g > visibleCount,
    I = x ? Math.max(1, visibleCount - 2) : visibleCount,
    V = x && I === visibleCount - 2,
    p = [],
    b = [],
    K = [],
    ee = [],
    q = [],
    D = 0;
  for (let [z, de] of toArray.entries()) {
    if ((ee.push(b.length), q.push(D), Be(de))) {
      p.push(D++);
      continue;
    }
    (b.push(Math.min(G[z] ?? 1, I)), K.push(dh(de) ? (de.key ?? void 0) : void 0), (D += b.at(-1) ?? 1));
  }
  let J = b.length,
    oe = c9(l),
    d = R(null),
    { containerRef: containerRef, ...u } = useSelectCursor({
      count: J,
      visibleCount: I,
      moreRowLines: V,
      headingLines: p,
      rowHeights: b,
      rowKeys: K,
      resetKey: i,
      initialCursor: t,
      isDisabled: l,
      edge: h ? "wrap" : "clamp",
      onUpFromFirstItem: A,
      onDownFromLastItem: T,
      declineHomeEnd: k,
      keybindingContext: M,
      onAccept: a,
      onRowKeyDown: m,
      onCursorChange: (z) => {
        ((d.current = { cursor: z, count: J }), f?.(z));
      },
    }),
    re = Oo((z) => f?.(z));
  (P(() => {
    let z = d.current;
    if (J === 0 || (z?.cursor === u.cursor && z.count === J)) return;
    ((d.current = { cursor: u.cursor, count: J }), re(u.cursor));
  }, [u.cursor, J]),
    useFocusOnMount(containerRef, !oe));
  let ne = useStrayClickGuard(),
    Y = useStrayClickFilter(),
    _ = (z) => ne(z) || Y.dropsClick(z);
  if (J === 0)
    return e(Box, {
      ref: containerRef,
      flexDirection: "column",
      tabIndex: 0,
      children: B && e(Text, { dimColor: !0, children: B }),
    });
  let X = E === void 0 || (E === "glyph" && visibleCount === 1) ? "count" : E,
    { windowStart: windowStart, windowEnd: windowEnd, moreAbove: moreAbove, moreBelow: moreBelow } = u,
    flattened = toArray.flatMap((z, de) => {
      let xe = q[de] ?? 0;
      return xe >= windowStart && xe < windowEnd ? [{ child: z, index: de, line: xe }] : [];
    }),
    Re = (z) =>
      oe && C === void 0
        ? void 0
        : (de) => {
            if ((u.scrollToEdge(z, oe), Y.pressed(de), oe)) C?.(d.current?.cursor ?? u.cursor);
          },
    c = X === "count" && e(MoreItemsIndicator, { direction: "above", count: moreAbove, onPress: Re(-1) }),
    O = X === "count" && e(MoreItemsIndicator, { direction: "below", count: moreBelow, onPress: Re(1) }),
    mapped = flattened.map(({ child: child, index: index, line: line }, Ko) => {
      let _o = dh(child) ? (child.key ?? line) : line,
        Vo = Ko === 0 && moreAbove > 0,
        zo = Ko === flattened.length - 1 && moreBelow > 0;
      if (Be(child))
        return e(
          ListItem,
          {
            isFocused: !1,
            showScrollUp: X === "glyph" && Vo,
            showScrollDown: X === "glyph" && zo,
            styled: !1,
            children: child,
          },
          _o,
        );
      let ve = ee[index] ?? 0,
        isCursor = u.isCursor(ve);
      return e(
        Eo.Provider,
        {
          value: isCursor && !oe,
          children: e(Box, {
            flexDirection: "column",
            height: b[ve],
            overflow: "hidden",
            onClick:
              oe && C !== void 0
                ? (ge) => {
                    if (ge.droppedAsStray || _(ge)) return;
                    (u.setCursor(ve), C(ve));
                  }
                : U === "move" && !oe && a !== void 0
                  ? (ge) => {
                      if (ge.droppedAsStray || _(ge) || c9(l)) return;
                      u.setCursor(ve);
                    }
                  : void 0,
            children: e(ListItem, {
              isFocused: isCursor,
              idle: oe,
              showScrollUp: X === "glyph" && Vo,
              showScrollDown: X === "glyph" && zo,
              styled: W,
              hoverStyle: N,
              declareCursor: !oe && Pn(child)?.declareCursor !== !1,
              onClick:
                oe || a === void 0 || U === "move"
                  ? void 0
                  : (ge) => {
                      if (_(ge) || c9(l)) return;
                      (u.setCursor(ve), a(ve));
                    },
              children: child,
            }),
          }),
        },
        _o,
      );
    }),
    ue = u.spareLines > 0 && e(Box, { flexShrink: 0, height: u.spareLines });
  if (!F)
    return e(knn, {
      value: Y.dropsClick,
      children: r(WindowedText, { windowStart: windowStart, ...u.bind, children: [c, mapped, ue, O] }),
    });
  let _e = r(WindowedText, { windowStart: windowStart, children: [mapped, ue] });
  return e(knn, {
    value: Y.dropsClick,
    children: r(Box, {
      flexDirection: "column",
      ...u.bind,
      children: [
        V ? null : c,
        r(SelectRow, {
          bar: V ? { ...u.scrollBar, arrows: !0 } : u.scrollBar,
          height: V ? visibleCount : void 0,
          children: [V ? c : null, _e, V ? O : null],
        }),
        V ? null : O,
      ],
    }),
  });
}
//@ chunk-r68xwcze.js:18622-18732 placement
function SelectGroupItem(o) {
  let i = w(2),
    { children: children } = o,
    a;
  if (i[0] !== children) ((a = e(Fragment, { children: children })), (i[0] = children), (i[1] = a));
  else a = i[1];
  return a;
}
//@ chunk-r68xwcze.js:18732-18842 placement
function SelectGroupHeading(o) {
  let i = w(2),
    { children: children } = o,
    a;
  if (i[0] !== children) ((a = e(Fragment, { children: children })), (i[0] = children), (i[1] = a));
  else a = i[1];
  return a;
}
//@ chunk-r68xwcze.js:18842-18883 placement
function Be(o) {
  return dh(o) && o.type === SelectGroupHeading;
}
//@ chunk-r68xwcze.js:18883-18974 placement
function Bo(o) {
  let t = Pn(o)?.lines ?? 1;
  return Number.isFinite(t) ? Math.max(1, Math.trunc(t)) : 1;
}
//@ chunk-r68xwcze.js:18974-19030 placement
function Pn(o) {
  return dh(o) && o.type === SelectGroupItem ? o.props : void 0;
}
//@ chunk-r68xwcze.js:19030-19076 placement
var merged = Object.assign(SelectGroup, { Item: SelectGroupItem, Heading: SelectGroupHeading });
//@ chunk-r68xwcze.js:19076-19105 placement
function Ft() {
  return new Set();
}
//@ chunk-r68xwcze.js:19105-19202 placement
function jt(q) {
  if (!Te(q)) {
    return 0;
  }
  let { icon: icon } = q.props;
  return dh(icon) && icon.type === StatusIcon ? Qmt() : bunStringWidth(reactNodeText(icon));
}
//@ chunk-r68xwcze.js:19202-19250 fingerprint = getTextContent (0.673)
function getTextContent(node) {
  return we(node.props.meta).length > 0;
}
//@ chunk-ey2qag4x.js:43084-43088 placement
j();
/**
 * 选择列表的鼠标滚轮处理（选项未全部可见时滚动）。
 */
//@ chunk-ey2qag4x.js:43088-43459 placement
function useSelectWheel({
  isDisabled: isDisabled,
  visibleFromIndex: visibleFromIndex,
  visibleToIndex: visibleToIndex,
  optionCount: optionCount,
  scrollViewport: scrollViewport,
  shouldDropWheel: shouldDropWheel,
}) {
  let d = R(null);
  if (isDisabled || visibleToIndex - visibleFromIndex >= optionCount) return { ref: d, onWheel: void 0 };
  return {
    ref: d,
    onWheel: (g) => {
      if (g.deltaY === 0 || shouldDropWheel()) return;
      let c = d.current;
      if (c !== null && g.col !== void 0 && g.row !== void 0 && hitTest(c, g.col, g.row) === null) return;
      if (scrollViewport(g.deltaY > 0 ? 1 : -1)) g.stopImmediatePropagation();
    },
  };
}
//@ chunk-ey2qag4x.js:43459-43500 layout = _temp7 (1)
function Jp(opt) {
  return opt.type === "input";
}
//@ chunk-ey2qag4x.js:43500-43538 file-local
function Xp(opt_0) {
  return opt_0.description;
}
//@ chunk-ey2qag4x.js:43538-43579 layout = _temp (1)
function Qp(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43579-43620 layout = _temp (1)
function Zp(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43620-43650 layout
function ef() {
  return { bold: !0 };
}
//@ chunk-ey2qag4x.js:43650-43691 layout = _temp (1)
function tf(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43691-43732 layout = _temp (1)
function nf(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43732-43773 layout = _temp (1)
function of(c) {
  return c.type === "image";
}
/**
 * 选择列表"尚未提交选择"的哨兵值。
 */
//@ chunk-ey2qag4x.js:43773-43807 placement
var NO_COMMITTED_ROW = Symbol("NO_COMMITTED_ROW");
/**
 * 通用单选：按 layout 渲染选项（可带描述、两栏、数字前缀），useSelectState 管理焦点与视口，支持 input 类型选项（就地编辑）、onFocus/onChange/onCancel。
 */
//@ chunk-ey2qag4x.js:44614-57659 fingerprint = Select (0.772)
function Select_2(t0) {
  let $ = w(89),
    {
      isDisabled: t1,
      hideIndexes: t2,
      disablePrintableKeybindings: disablePrintableKeybindings,
      visibleOptionCount: t3,
      hiddenBelowUnit: hiddenBelowUnit,
      highlightText: highlightText,
      options: options,
      columnSizingOptions: columnSizingOptions,
      defaultValue: defaultValue,
      selectedValue: selectedValue,
      onCancel: onCancel,
      onChange: onChange,
      onFocus: onFocus,
      defaultFocusValue: defaultFocusValue,
      layout: t4,
      disableSelection: t5,
      inlineDescriptions: t6,
      hoverStyle: hoverStyle,
      inputChromeWidth: inputChromeWidth,
      onUpFromFirstItem: onUpFromFirstItem,
      onDownFromLastItem: onDownFromLastItem,
      onInputModeToggle: onInputModeToggle,
      onOpenEditor: onOpenEditor,
      canPasteImage: canPasteImage,
      onImagePaste: onImagePaste,
      pastedContents: pastedContents,
      onRemoveImage: onRemoveImage,
      pointerWhileDisabled: pointerWhileDisabled,
    } = t0,
    Y = t1 === void 0 ? !1 : t1,
    J = t2 === void 0 ? !1 : t2,
    ye = disablePrintableKeybindings === void 0 ? !1 : disablePrintableKeybindings,
    fe = t3 === void 0 ? 5 : t3,
    ee = columnSizingOptions === void 0 ? options : columnSizingOptions,
    O = t4 === void 0 ? "compact" : t4,
    xe = t5 === void 0 ? !1 : t5,
    U = t6 === void 0 ? !1 : t6,
    me = inputChromeWidth === void 0 ? 0 : inputChromeWidth,
    X = pointerWhileDisabled === void 0 ? !1 : pointerWhileDisabled,
    [le, Te] = y(!1),
    [Ve, ne] = y(0),
    we;
  if ($[0] !== options)
    ((we = () => {
      let initialMap = new Map();
      return (
        options.forEach((option) => {
          if (option.type === "input" && option.initialValue)
            initialMap.set(option.value, option.initialValue);
        }),
        initialMap
      );
    }),
      ($[0] = options),
      ($[1] = we));
  else we = $[1];
  let [Ce, mt] = y(we),
    Be;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Be = new Map()), ($[2] = Be));
  else Be = $[2];
  let lastInitialValues = R(Be),
    Vt,
    Nt;
  if ($[3] !== Ce || $[4] !== options)
    ((Vt = () => {
      for (const option_0 of options) {
        if (option_0.type === "input" && option_0.initialValue !== void 0) {
          let yt = lastInitialValues.current.get(option_0.value) ?? "";
          let _e = Ce.get(option_0.value) ?? "";
          let newInitial = option_0.initialValue;
          if (newInitial !== yt && _e === yt)
            mt((prev) => {
              let next = new Map(prev);
              return (next.set(option_0.value, newInitial), next);
            });
          lastInitialValues.current.set(option_0.value, newInitial);
        }
      }
    }),
      (Nt = [options, Ce]),
      ($[3] = Ce),
      ($[4] = options),
      ($[5] = Vt),
      ($[6] = Nt));
  else ((Vt = $[5]), (Nt = $[6]));
  P(Vt, Nt);
  let ct = O === "compact" && !U && !ee.some(Jp) && ee.some(Xp),
    { columns: columns } = useScrollViewportSize(useTerminalSize());
  const De = fitVisibleOptionCount(fe, ct ? "compact-vertical" : O);
  let Ne;
  if (
    $[7] !== defaultFocusValue ||
    $[8] !== defaultValue ||
    $[9] !== onCancel ||
    $[10] !== onChange ||
    $[11] !== onFocus ||
    $[12] !== options ||
    $[13] !== selectedValue ||
    $[14] !== De
  )
    ((Ne = {
      visibleOptionCount: De,
      options: options,
      defaultValue: defaultValue,
      selectedValue: selectedValue,
      onChange: onChange,
      onCancel: onCancel,
      onFocus: onFocus,
      focusValue: defaultFocusValue,
    }),
      ($[7] = defaultFocusValue),
      ($[8] = defaultValue),
      ($[9] = onCancel),
      ($[10] = onChange),
      ($[11] = onFocus),
      ($[12] = options),
      ($[13] = selectedValue),
      ($[14] = De),
      ($[15] = Ne));
  else Ne = $[15];
  let state = useSelectState_2(Ne),
    [Ft, St] = y(!0),
    Le = useStrayClickGuard(),
    wt = useIsWithinStrayWindow(),
    kt;
  if ($[16] !== xe || $[17] !== Y || $[18] !== X || $[19] !== Le || $[20] !== state)
    ((kt = (bt) =>
      (Y && !X) || xe === !0 || bt.disabled === !0
        ? void 0
        : (on) => {
            if (Le(on)) {
              return;
            }
            if (bt.type === "input") state.focusOption(bt.value);
            else state.onChange?.(bt.value);
          }),
      ($[16] = xe),
      ($[17] = Y),
      ($[18] = X),
      ($[19] = Le),
      ($[20] = state),
      ($[21] = kt));
  else kt = $[21];
  let Ge = kt;
  const Lt = xe || (J ? "numeric" : !1);
  let Ze;
  if ($[22] !== pastedContents)
    ((Ze = () => {
      if (pastedContents && Object.values(pastedContents).some(Qp)) {
        let imageCount = count(Object.values(pastedContents), Zp);
        return (Te(!0), ne(imageCount - 1), !0);
      }
      return !1;
    }),
      ($[22] = pastedContents),
      ($[23] = Ze));
  else Ze = $[23];
  let _n;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((_n = () => {
      Te(!1);
    }),
      ($[24] = _n));
  else _n = $[24];
  let Rt;
  if (
    $[25] !== Ft ||
    $[26] !== le ||
    $[27] !== Ce ||
    $[28] !== Y ||
    $[29] !== onDownFromLastItem ||
    $[30] !== onInputModeToggle ||
    $[31] !== onUpFromFirstItem ||
    $[32] !== options ||
    $[33] !== state ||
    $[34] !== Lt ||
    $[35] !== Ze
  )
    ((Rt = {
      isDisabled: Y,
      hasInkFocus: Ft,
      disableSelection: Lt,
      state: state,
      options: options,
      isMultiSelect: !1,
      onUpFromFirstItem: onUpFromFirstItem,
      onDownFromLastItem: onDownFromLastItem,
      onInputModeToggle: onInputModeToggle,
      inputValues: Ce,
      imagesSelected: le,
      onEnterImageSelection: Ze,
      onExitImageSelection: _n,
    }),
      ($[25] = Ft),
      ($[26] = le),
      ($[27] = Ce),
      ($[28] = Y),
      ($[29] = onDownFromLastItem),
      ($[30] = onInputModeToggle),
      ($[31] = onUpFromFirstItem),
      ($[32] = options),
      ($[33] = state),
      ($[34] = Lt),
      ($[35] = Ze),
      ($[36] = Rt));
  else Rt = $[36];
  let { handleKeyDown: handleKeyDown } = useSelectInput(Rt),
    qn;
  if (
    $[37] !== canPasteImage ||
    $[38] !== options ||
    $[39] !== state.focusOption ||
    $[40] !== state.focusedValue
  )
    ((qn = {
      options: options,
      focusedValue: state.focusedValue,
      focusOption: state.focusOption,
      canPaste: canPasteImage,
    }),
      ($[37] = canPasteImage),
      ($[38] = options),
      ($[39] = state.focusOption),
      ($[40] = state.focusedValue),
      ($[41] = qn));
  else qn = $[41];
  let Xo = usePasteIntoInputOption(qn),
    rn = R(null);
  useFocusOnMount(rn, !Y);
  let et = {
      container: () => ({
        flexDirection: "column",
        ref: rn,
        ...(Y
          ? {}
          : {
              tabIndex: 0,
              textEntry: ye ? !0 : void 0,
              onKeyDown: handleKeyDown,
              onPaste: Xo,
              onFocus: () => St(!0),
              onBlur: () => St(!1),
            }),
      }),
      highlightedText: ef,
    },
    Ct;
  if (
    $[42] !== hiddenBelowUnit ||
    $[43] !== options.length ||
    $[44] !== state.visibleFromIndex ||
    $[45] !== state.visibleToIndex
  )
    ((Ct =
      hiddenBelowUnit !== void 0 && state.visibleToIndex - state.visibleFromIndex < options.length
        ? e(Box, {
            paddingLeft: 3,
            height: 1,
            children: e(OverflowHint, {
              count: options.length - state.visibleToIndex,
              unit: hiddenBelowUnit,
            }),
          })
        : null),
      ($[42] = hiddenBelowUnit),
      ($[43] = options.length),
      ($[44] = state.visibleFromIndex),
      ($[45] = state.visibleToIndex),
      ($[46] = Ct));
  else Ct = $[46];
  let vt = Ct,
    ln;
  if (
    $[47] !== Y ||
    $[48] !== options.length ||
    $[49] !== wt ||
    $[50] !== state.scrollViewport ||
    $[51] !== state.visibleFromIndex ||
    $[52] !== state.visibleToIndex
  )
    ((ln = {
      isDisabled: Y,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel: wt,
    }),
      ($[47] = Y),
      ($[48] = options.length),
      ($[49] = wt),
      ($[50] = state.scrollViewport),
      ($[51] = state.visibleFromIndex),
      ($[52] = state.visibleToIndex),
      ($[53] = ln));
  else ln = $[53];
  let ft = useSelectWheel(ln);
  if (O === "expanded") {
    let Ue;
    if ($[54] !== J || $[55] !== state.options)
      ((Ue = J ? 0 : state.options.length.toString().length),
        ($[54] = J),
        ($[55] = state.options),
        ($[56] = Ue));
    else Ue = $[56];
    let an = Ue;
    return e(WindowedRowsBox, {
      container: et.container(),
      rows: ft,
      hiddenBelow: vt,
      children: state.visibleOptions.map((option_1, index) => {
        let cn = option_1.index === state.visibleFromIndex;
        let tt = option_1.index === state.visibleToIndex - 1;
        let pn = state.visibleToIndex < options.length;
        let On = state.visibleFromIndex > 0;
        let Yn = state.visibleFromIndex + index + 1;
        let fn = !Y && state.focusedValue === option_1.value;
        let Jn = state.value === option_1.value;
        if (option_1.type === "input") {
          let Ql = Ce.has(option_1.value) ? Ce.get(option_1.value) : option_1.initialValue || "";
          return e(
            SelectInputOption,
            {
              option: option_1,
              onClick: Ge(option_1),
              hoverStyle: hoverStyle,
              isFocused: fn,
              isSelected: Jn,
              shouldShowDownArrow: pn && tt,
              shouldShowUpArrow: On && cn,
              maxIndexWidth: an,
              index: Yn,
              hideIndex: J,
              extraChromeWidth: me,
              inputValue: Ql,
              onInputChange: (value) => {
                mt((prev_0) => {
                  let next_0 = new Map(prev_0);
                  return (next_0.set(option_1.value, value), next_0);
                });
              },
              onSubmit: (value_0) => {
                let sf = pastedContents && Object.values(pastedContents).some(tf);
                if (value_0.trim() || sf || option_1.allowEmptySubmitToCancel) onChange?.(option_1.value);
                else if (!option_1.ignoreEmptySubmit) onCancel?.();
              },
              onExit: onCancel,
              layout: "expanded",
              showLabel: U,
              onOpenEditor: onOpenEditor,
              resetCursorOnUpdate: option_1.resetCursorOnUpdate,
              canPasteImage: canPasteImage,
              onImagePaste: onImagePaste,
              pastedContents: pastedContents,
              onRemoveImage: onRemoveImage,
              imagesSelected: le,
              selectedImageIndex: Ve,
              onImagesSelectedChange: Te,
              onSelectedImageIndexChange: ne,
            },
            String(option_1.value),
          );
        }
        let label = option_1.label;
        if (typeof option_1.label === "string" && highlightText && option_1.label.includes(highlightText)) {
          let labelText = option_1.label;
          let index_0 = labelText.indexOf(highlightText);
          label = r(Fragment, {
            children: [
              labelText.slice(0, index_0),
              e(Text, { ...et.highlightedText(), children: highlightText }),
              labelText.slice(index_0 + highlightText.length),
            ],
          });
        }
        let us = option_1.disabled === !0;
        let sa = us ? void 0 : Jn ? "success" : fn ? "suggestion" : void 0;
        return r(
          Box,
          {
            flexDirection: "column",
            flexShrink: 0,
            children: [
              e(SelectOption, {
                isFocused: fn,
                isSelected: Jn,
                shouldShowDownArrow: pn && tt,
                shouldShowUpArrow: On && cn,
                onClick: Ge(option_1),
                hoverStyle: hoverStyle,
                children: e(Text, { dimColor: us, color: sa, children: label }),
              }),
              option_1.description &&
                e(Box, {
                  paddingLeft: 2,
                  children: e(Text, {
                    dimColor: us || option_1.dimDescription !== !1,
                    color: sa,
                    children: e(Ansi, { children: option_1.description }),
                  }),
                }),
              e(Text, { children: " " }),
            ],
          },
          String(option_1.value),
        );
      }),
    });
  }
  if (O === "compact-vertical") {
    let Ue;
    if ($[57] !== J || $[58] !== state.options)
      ((Ue = J ? 0 : state.options.length.toString().length),
        ($[57] = J),
        ($[58] = state.options),
        ($[59] = Ue));
    else Ue = $[59];
    let ds = Ue;
    return e(WindowedRowsBox, {
      container: et.container(),
      rows: ft,
      hiddenBelow: vt,
      children: state.visibleOptions.map((option_2, index_1) => {
        let ra = option_2.index === state.visibleFromIndex;
        let la = option_2.index === state.visibleToIndex - 1;
        let aa = state.visibleToIndex < options.length;
        let ua = state.visibleFromIndex > 0;
        let da = state.visibleFromIndex + index_1 + 1;
        let Qo = !Y && state.focusedValue === option_2.value;
        let Zo = state.value === option_2.value;
        if (option_2.type === "input") {
          let lf = Ce.has(option_2.value) ? Ce.get(option_2.value) : option_2.initialValue || "";
          return e(
            SelectInputOption,
            {
              option: option_2,
              onClick: Ge(option_2),
              hoverStyle: hoverStyle,
              isFocused: Qo,
              isSelected: Zo,
              shouldShowDownArrow: aa && la,
              shouldShowUpArrow: ua && ra,
              maxIndexWidth: ds,
              index: da,
              hideIndex: J,
              extraChromeWidth: me,
              inputValue: lf,
              onInputChange: (value_1) => {
                mt((prev_1) => {
                  let next_1 = new Map(prev_1);
                  return (next_1.set(option_2.value, value_1), next_1);
                });
              },
              onSubmit: (value_2) => {
                let cf = pastedContents && Object.values(pastedContents).some(nf);
                if (value_2.trim() || cf || option_2.allowEmptySubmitToCancel) onChange?.(option_2.value);
                else if (!option_2.ignoreEmptySubmit) onCancel?.();
              },
              onExit: onCancel,
              layout: "compact",
              showLabel: U,
              onOpenEditor: onOpenEditor,
              resetCursorOnUpdate: option_2.resetCursorOnUpdate,
              canPasteImage: canPasteImage,
              onImagePaste: onImagePaste,
              pastedContents: pastedContents,
              onRemoveImage: onRemoveImage,
              imagesSelected: le,
              selectedImageIndex: Ve,
              onImagesSelectedChange: Te,
              onSelectedImageIndexChange: ne,
            },
            String(option_2.value),
          );
        }
        let label_0 = option_2.label;
        if (typeof option_2.label === "string" && highlightText && option_2.label.includes(highlightText)) {
          let labelText_0 = option_2.label;
          let index_2 = labelText_0.indexOf(highlightText);
          label_0 = r(Fragment, {
            children: [
              labelText_0.slice(0, index_2),
              e(Text, { ...et.highlightedText(), children: highlightText }),
              labelText_0.slice(index_2 + highlightText.length),
            ],
          });
        }
        let ei = option_2.disabled === !0;
        return r(
          Box,
          {
            flexDirection: "column",
            flexShrink: 0,
            children: [
              e(SelectOption, {
                isFocused: Qo,
                isSelected: Zo,
                shouldShowDownArrow: aa && la,
                shouldShowUpArrow: ua && ra,
                onClick: Ge(option_2),
                hoverStyle: hoverStyle,
                children: r(Fragment, {
                  children: [
                    !J && e(Text, { dimColor: !0, children: `${da}.`.padEnd(ds + 1) }),
                    e(Text, {
                      dimColor: ei,
                      color: ei ? void 0 : Zo ? "success" : Qo ? "suggestion" : void 0,
                      children: label_0,
                    }),
                  ],
                }),
              }),
              option_2.description &&
                e(Box, {
                  paddingLeft: J ? 4 : ds + 4,
                  children: e(Text, {
                    dimColor: ei || option_2.dimDescription !== !1,
                    color: ei ? void 0 : Zo ? "success" : Qo ? "suggestion" : void 0,
                    children: e(Ansi, { children: option_2.description }),
                  }),
                }),
            ],
          },
          String(option_2.value),
        );
      }),
    });
  }
  let Ue;
  if ($[60] !== ee || $[61] !== J)
    ((Ue = J ? 0 : ee.length.toString().length), ($[60] = ee), ($[61] = J), ($[62] = Ue));
  else Ue = $[62];
  let Ut = Ue;
  if (ct) {
    let Kt, Xn;
    if ($[63] !== columns || $[64] !== ee || $[65] !== J || $[66] !== Ut || $[67] !== state.value) {
      Kt = J ? 0 : Ut + 2;
      let $t;
      if ($[70] !== ee || $[71] !== Kt || $[72] !== state.value) {
        let Mt;
        if ($[74] !== Kt || $[75] !== state.value)
          ((Mt = (fs) => {
            if (fs.type === "input") {
              return 0;
            }
            let pf = state.value === fs.value ? 2 : 0;
            return 2 + Kt + bunStringWidth(reactNodeText(fs.label)) + pf;
          }),
            ($[74] = Kt),
            ($[75] = state.value),
            ($[76] = Mt));
        else Mt = $[76];
        $t = Math.max(...ee.map(Mt));
        (($[70] = ee), ($[71] = Kt), ($[72] = state.value), ($[73] = $t));
      } else $t = $[73];
      Xn = Math.min($t, Math.floor(columns * _Rr));
      (($[63] = columns),
        ($[64] = ee),
        ($[65] = J),
        ($[66] = Ut),
        ($[67] = state.value),
        ($[68] = Kt),
        ($[69] = Xn));
    } else ((Kt = $[68]), (Xn = $[69]));
    let optionData = state.visibleOptions.map((option_3, index_3) => {
      let mf = option_3.index === state.visibleFromIndex;
      let hf = option_3.index === state.visibleToIndex - 1;
      let bf = state.visibleToIndex < options.length;
      let gf = state.visibleFromIndex > 0;
      let vf = state.visibleFromIndex + index_3 + 1;
      let xf = !Y && state.focusedValue === option_3.value;
      let ma = state.value === option_3.value;
      let If = option_3.disabled === !0;
      let ha = ma ? 2 : 0;
      let Qn = reactNodeText(option_3.label);
      let label_1 = option_3.label;
      let ba = Xn - 2 - Kt - ha;
      if (bunStringWidth(Qn) > ba) ((Qn = truncateToWidth(Qn, ba)), (label_1 = Qn));
      if (typeof label_1 === "string" && highlightText && label_1.includes(highlightText)) {
        let ms = label_1;
        let idx = ms.indexOf(highlightText);
        label_1 = r(Fragment, {
          children: [
            ms.slice(0, idx),
            e(Text, { ...et.highlightedText(), children: highlightText }),
            ms.slice(idx + highlightText.length),
          ],
        });
      }
      return {
        option: option_3,
        index: vf,
        label: label_1,
        labelWidth: 2 + Kt + bunStringWidth(Qn) + ha,
        isFocused: xf,
        isSelected: ma,
        isOptionDisabled: If,
        shouldShowDownArrow: bf && hf,
        shouldShowUpArrow: gf && mf,
      };
    });
    const container = et.container();
    let Mt;
    if ($[77] !== Ge || $[78] !== J || $[79] !== hoverStyle || $[80] !== Ut || $[81] !== Xn)
      ((Mt = (data) => {
        if (data.option.type === "input") {
          return null;
        }
        let va = Xn - data.labelWidth;
        return r(
          SelectOptionRow,
          {
            isFocused: data.isFocused,
            shouldShowDownArrow: data.shouldShowDownArrow,
            shouldShowUpArrow: data.shouldShowUpArrow,
            onClick: Ge(data.option),
            hoverStyle: hoverStyle,
            children: [
              r(Box, {
                flexDirection: "row",
                flexShrink: 0,
                children: [
                  e(Text, { children: " " }),
                  r(Text, {
                    dimColor: data.isOptionDisabled,
                    color: data.isOptionDisabled
                      ? void 0
                      : data.isSelected
                        ? "success"
                        : data.isFocused
                          ? "suggestion"
                          : void 0,
                    children: [
                      !J && e(Text, { dimColor: !0, children: `${data.index}.`.padEnd(Ut + 2) }),
                      data.label,
                    ],
                  }),
                  data.isSelected && r(Text, { children: [" ", e(StatusIcon, { status: "success" })] }),
                  va > 0 && e(Text, { children: " ".repeat(va) }),
                ],
              }),
              e(Box, {
                flexGrow: 1,
                marginLeft: 2,
                children: e(Text, {
                  wrap: "wrap",
                  dimColor:
                    data.option.descriptionColor === void 0 &&
                    (data.isOptionDisabled || data.option.dimDescription !== !1),
                  color: data.isOptionDisabled
                    ? data.option.descriptionColor
                    : data.isSelected
                      ? "success"
                      : data.isFocused
                        ? "suggestion"
                        : data.option.descriptionColor,
                  children: e(Ansi, { children: data.option.description || " " }),
                }),
              }),
            ],
          },
          String(data.option.value),
        );
      }),
        ($[77] = Ge),
        ($[78] = J),
        ($[79] = hoverStyle),
        ($[80] = Ut),
        ($[81] = Xn),
        ($[82] = Mt));
    else Mt = $[82];
    return e(WindowedRowsBox, {
      container: container,
      rows: ft,
      hiddenBelow: vt,
      children: optionData.map(Mt),
    });
  }
  const hs = WindowedRowsBox,
    container = et.container(),
    mapped = state.visibleOptions.map((option_4, index_4) => {
      if (option_4.type === "input") {
        let Sf = Ce.has(option_4.value) ? Ce.get(option_4.value) : option_4.initialValue || "";
        let wf = option_4.index === state.visibleFromIndex;
        let Cf = option_4.index === state.visibleToIndex - 1;
        let Of = state.visibleToIndex < options.length;
        let Tf = state.visibleFromIndex > 0;
        let Df = state.visibleFromIndex + index_4 + 1;
        let Vf = !Y && state.focusedValue === option_4.value;
        let Ff = state.value === option_4.value;
        return e(
          SelectInputOption,
          {
            option: option_4,
            onClick: Ge(option_4),
            hoverStyle: hoverStyle,
            isFocused: Vf,
            isSelected: Ff,
            shouldShowDownArrow: Of && Cf,
            shouldShowUpArrow: Tf && wf,
            maxIndexWidth: Ut,
            index: Df,
            hideIndex: J,
            extraChromeWidth: me,
            inputValue: Sf,
            onInputChange: (value_3) => {
              mt((prev_2) => {
                let next_2 = new Map(prev_2);
                return (next_2.set(option_4.value, value_3), next_2);
              });
            },
            onSubmit: (value_4) => {
              let Ef = pastedContents && Object.values(pastedContents).some(of);
              if (value_4.trim() || Ef || option_4.allowEmptySubmitToCancel) onChange?.(option_4.value);
              else if (!option_4.ignoreEmptySubmit) onCancel?.();
            },
            onExit: onCancel,
            layout: "compact",
            showLabel: U,
            onOpenEditor: onOpenEditor,
            resetCursorOnUpdate: option_4.resetCursorOnUpdate,
            canPasteImage: canPasteImage,
            onImagePaste: onImagePaste,
            pastedContents: pastedContents,
            onRemoveImage: onRemoveImage,
            imagesSelected: le,
            selectedImageIndex: Ve,
            onImagesSelectedChange: Te,
            onSelectedImageIndexChange: ne,
          },
          String(option_4.value),
        );
      }
      let label_2 = option_4.label;
      if (typeof option_4.label === "string" && highlightText && option_4.label.includes(highlightText)) {
        let labelText_4 = option_4.label;
        let index_5 = labelText_4.indexOf(highlightText);
        label_2 = r(Fragment, {
          children: [
            labelText_4.slice(0, index_5),
            e(Text, { ...et.highlightedText(), children: highlightText }),
            labelText_4.slice(index_5 + highlightText.length),
          ],
        });
      }
      let Pf = option_4.index === state.visibleFromIndex;
      let Af = option_4.index === state.visibleToIndex - 1;
      let Wf = state.visibleToIndex < options.length;
      let Bf = state.visibleFromIndex > 0;
      let Nf = state.visibleFromIndex + index_4 + 1;
      let gs = !Y && state.focusedValue === option_4.value;
      let vs = state.value === option_4.value;
      let Zn = option_4.disabled === !0;
      return r(
        SelectOption,
        {
          isFocused: gs,
          isSelected: vs,
          shouldShowDownArrow: Wf && Af,
          shouldShowUpArrow: Bf && Pf,
          onClick: Ge(option_4),
          hoverStyle: hoverStyle,
          children: [
            r(Box, {
              flexDirection: "row",
              flexShrink: 0,
              children: [
                !J && e(Text, { dimColor: !0, children: `${Nf}.`.padEnd(Ut + 2) }),
                r(Text, {
                  dimColor: Zn,
                  color: Zn ? void 0 : vs ? "success" : gs ? "suggestion" : void 0,
                  children: [
                    label_2,
                    U &&
                      option_4.description &&
                      r(Text, {
                        dimColor: Zn || option_4.dimDescription !== !1,
                        children: [" ", option_4.description],
                      }),
                  ],
                }),
              ],
            }),
            !U &&
              option_4.description &&
              e(Box, {
                flexShrink: 99,
                marginLeft: 2,
                children: e(Text, {
                  wrap: "wrap-trim",
                  dimColor: Zn || option_4.dimDescription !== !1,
                  color: Zn ? void 0 : vs ? "success" : gs ? "suggestion" : void 0,
                  children: e(Ansi, { children: option_4.description }),
                }),
              }),
          ],
        },
        String(option_4.value),
      );
    });
  let wa;
  if ($[83] !== hs || $[84] !== vt || $[85] !== ft || $[86] !== container || $[87] !== mapped)
    ((wa = e(hs, { container: container, rows: ft, hiddenBelow: vt, children: mapped })),
      ($[83] = hs),
      ($[84] = vt),
      ($[85] = ft),
      ($[86] = container),
      ($[87] = mapped),
      ($[88] = wa));
  else wa = $[88];
  return wa;
}
//@ chunk-ey2qag4x.js:57659-57676 layout
var Gl = 8,
  _Rr = 0.6;
/**
 * 按终端行数与布局（expanded 每项 3 行、compact 1 行、其他 2 行）算最多可见选项数，不超过 t。
 */
//@ chunk-ey2qag4x.js:57676-57834 placement
function fitVisibleOptionCount(t, o) {
  let i = o === void 0 ? "compact" : o,
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    l = i === "expanded" ? 3 : i === "compact" ? 1 : 2,
    max = Math.max(1, Math.floor((rows - Gl) / l));
  return Math.min(t, max);
}
//@ chunk-ey2qag4x.js:57834-58108 placement
function WindowedRowsBox(t) {
  let f = w(7),
    { container: container, rows: rows, hiddenBelow: hiddenBelow, children: children } = t,
    d;
  if (f[0] !== children || f[1] !== rows)
    ((d = e(WindowedText, { ...rows, children: children })), (f[0] = children), (f[1] = rows), (f[2] = d));
  else d = f[2];
  let u;
  if (f[3] !== container || f[4] !== hiddenBelow || f[5] !== d)
    ((u = r(Box, { ...container, children: [d, hiddenBelow] })),
      (f[3] = container),
      (f[4] = hiddenBelow),
      (f[5] = d),
      (f[6] = u));
  else u = f[6];
  return u;
}
/**
 * 选择列表的一行（焦点、上下箭头、点击与悬停样式）。
 */
//@ chunk-ey2qag4x.js:58108-59296 placement
function SelectOptionRow(t) {
  let x = w(24),
    {
      isFocused: isFocused,
      shouldShowDownArrow: shouldShowDownArrow,
      shouldShowUpArrow: shouldShowUpArrow,
      onClick: onClick,
      hoverStyle: hoverStyle,
      children: children,
    } = t,
    u = onClick !== void 0,
    [g, c] = useHoverHighlight(u),
    b = WDe(hoverStyle),
    V = u && g && b === "inverse",
    C;
  if (x[0] !== isFocused) ((C = { line: 0, column: 0, active: isFocused }), (x[0] = isFocused), (x[1] = C));
  else C = x[1];
  let B = useDeclaredCursor(C);
  const N = u && g && b === "tint" ? USER_MESSAGE_BACKGROUND : void 0;
  let h;
  if (x[2] !== u || x[3] !== c) ((h = u ? () => c(!0) : void 0), (x[2] = u), (x[3] = c), (x[4] = h));
  else h = x[4];
  let K;
  if (x[5] !== u || x[6] !== c) ((K = u ? () => c(!1) : void 0), (x[5] = u), (x[6] = c), (x[7] = K));
  else K = x[7];
  let m;
  if (
    x[8] !== u ||
    x[9] !== b ||
    x[10] !== g ||
    x[11] !== V ||
    x[12] !== isFocused ||
    x[13] !== shouldShowDownArrow ||
    x[14] !== shouldShowUpArrow
  )
    ((m = e(Box, {
      flexShrink: 0,
      children: isFocused
        ? e(Text, { color: "suggestion", inverse: V, children: re.pointer })
        : shouldShowDownArrow
          ? e(Text, { dimColor: !0, inverse: V, children: re.arrowDown })
          : shouldShowUpArrow
            ? e(Text, { dimColor: !0, inverse: V, children: re.arrowUp })
            : u && g && b === "pointer"
              ? e(Text, { dimColor: !0, children: re.pointer })
              : e(Text, { inverse: V, children: " " }),
    })),
      (x[8] = u),
      (x[9] = b),
      (x[10] = g),
      (x[11] = V),
      (x[12] = isFocused),
      (x[13] = shouldShowDownArrow),
      (x[14] = shouldShowUpArrow),
      (x[15] = m));
  else m = x[15];
  let W;
  if (
    x[16] !== children ||
    x[17] !== B ||
    x[18] !== onClick ||
    x[19] !== N ||
    x[20] !== h ||
    x[21] !== K ||
    x[22] !== m
  )
    ((W = r(Box, {
      ref: B,
      flexDirection: "row",
      flexShrink: 0,
      backgroundColor: N,
      onClick: onClick,
      onMouseEnter: h,
      onMouseLeave: K,
      children: [m, children],
    })),
      (x[16] = children),
      (x[17] = B),
      (x[18] = onClick),
      (x[19] = N),
      (x[20] = h),
      (x[21] = K),
      (x[22] = m),
      (x[23] = W));
  else W = x[23];
  return W;
}
//@ chunk-8jypjjdf.js:1309-1313 placement
j();
//@ chunk-8jypjjdf.js:1313-1642 fingerprint = TwoColumnRow (0.736)
function TwoColumnRow(t0) {
  let $ = w(10),
    t,
    l,
    c;
  if ($[0] !== t0) (({ active: t, children: c, ...l } = t0), ($[0] = t0), ($[1] = t), ($[2] = l), ($[3] = c));
  else ((t = $[1]), (l = $[2]), (c = $[3]));
  let m;
  if ($[4] !== t) ((m = { line: 0, column: 0, active: t }), ($[4] = t), ($[5] = m));
  else m = $[5];
  let cursorRef = useDeclaredCursor(m),
    d;
  if ($[6] !== l || $[7] !== c || $[8] !== cursorRef)
    ((d = e(Box, { ...l, ref: cursorRef, children: c })),
      ($[6] = l),
      ($[7] = c),
      ($[8] = cursorRef),
      ($[9] = d));
  else d = $[9];
  return d;
}
/**
 * "自动模式成为默认"的状态提示组件：显示标题、说明与链接，并在显示时记为已读。
 */
//@ chunk-ag5x7vhf.js:86912-87298 fingerprint = _temp4 (0.641)
function AutoModeDefaultNotice() {
  let $ = w(5),
    { storageV5: storageV5 } = Me(),
    x;
  if ($[0] !== storageV5) ((x = () => markAutoDefaultNoticeSeen(storageV5)), ($[0] = storageV5), ($[1] = x));
  else x = $[1];
  at(AUTO_MODE_DEFAULT, x);
  let k, _;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((k = e(Text, { bold: !0, children: AUTO_DEFAULT_NOTICE_TITLE })),
      (_ = e(Text, { dimColor: !0, children: AUTO_DEFAULT_NOTICE_BODY })),
      ($[2] = k),
      ($[3] = _));
  else ((k = $[2]), (_ = $[3]));
  let I;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((I = r(Box, {
      flexDirection: "column",
      children: [
        k,
        _,
        e(Text, {
          dimColor: !0,
          children: e(Link, {
            url: AUTO_DEFAULT_NOTICE_URL,
            fallback: AUTO_DEFAULT_NOTICE_URL,
            children: AUTO_DEFAULT_NOTICE_URL,
          }),
        }),
      ],
    })),
      ($[4] = I));
  else I = $[4];
  return I;
}

export {
  NO_COMMITTED_ROW,
  MoreItemsIndicator,
  ScrollArrowButton,
  computeScrollWindow,
  AutoModeDefaultNotice,
  merged,
  pM,
  fitVisibleOptionCount,
  TwoColumnRow,
  SelectRow,
  Select_2,
  useSelectWheel,
  c9,
  knn,
  _Rr,
  Ft,
  jt,
  getTextContent,
};
