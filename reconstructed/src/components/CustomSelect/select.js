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
import {
  init_react_production,
  y,
  R,
  P,
  Oo,
  qt,
  Se,
  yt,
  Fy,
  zt,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import {
  userMessageBackgroundMode,
  USER_MESSAGE_BACKGROUND,
  Select,
  WindowedText,
  useHoverHighlight,
} from "./selectTypeahead.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  UP_ARROW,
  DOWN_ARROW,
  HEAVY_VERTICAL_BAR_GLYPH,
} from "../../utils/permissions/autoModeRulesPrompt.js";
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
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { ContextSlotA, contextSlot } from "../../context/contextSlots.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { ListItem } from "../design-system/ListItem.js";
import { isOrderedListItem, metaTexts } from "./selectTable.js";
import { StatusIcon, maxStatusIconWidth } from "../design-system/StatusIcon.js";
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
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  markAutoDefaultNoticeSeen,
  AUTO_MODE_DEFAULT,
  AUTO_DEFAULT_NOTICE_TITLE,
  AUTO_DEFAULT_NOTICE_BODY,
  AUTO_DEFAULT_NOTICE_URL,
} from "../LogoV2/AutoModeDefaultNotice.js";
import { useNoticeImpression } from "../LogoV2/CondensedLogo.js";

//@ chunk-r68xwcze.js:1089-1093 placement
init_react_production();
//@ chunk-r68xwcze.js:1093-1097 placement
init_react_production();
//@ chunk-r68xwcze.js:1097-1101 placement
init_react_production();
//@ chunk-r68xwcze.js:1101-1105 placement
init_react_production();
//@ chunk-r68xwcze.js:1105-1134 placement
var MULTI_CLICK_MIN_MS = 150;
var MULTI_CLICK_MAX_MS_2 = 400;
var CLICK_TIME_SLOP_MS = 60;
var CLICK_CELL_SLOP = 1;
//@ chunk-r68xwcze.js:1134-1211 placement = comparePoints (0.803)
function isNearPoint(a, b) {
  return Math.abs(b.col - a.col) <= CLICK_CELL_SLOP && Math.abs(b.row - a.row) <= CLICK_CELL_SLOP;
}
//@ chunk-r68xwcze.js:1211-2584 placement
function ScrollArrowButton({ children, paddingX = 0, onPress, repeat = false }) {
  let clock = useClock();
  let strayClickGuard = useStrayClickGuard();
  let l = userMessageBackgroundMode();
  let [C, h] = y(false);
  let [A, T] = y(false);
  let k = R(null);
  let [M, E] = y(null);
  let F = R(null);
  P(() => () => F.current?.(), []);
  let B = onPress !== undefined;
  if (!B && (C || A || M !== null)) {
    h(false);
    T(false);
    E(null);
  }
  P(() => {
    if (!B) k.current = null;
  }, [B]);
  let N = Oo((x) => {
    let I = k.current;
    if (I !== x) return;
    I.hasActed = true;
    onPress?.({
      row: I.row,
    });
  });
  P(() => {
    if (M === null) return;
    let x = clock.setTimeout(function I() {
      N(M);
      x = clock.setTimeout(I, CLICK_TIME_SLOP_MS);
    }, MULTI_CLICK_MAX_MS_2);
    return () => x();
  }, [M, clock]);
  function U(event) {
    event.stopImmediatePropagation();
    if (F.current !== null || strayClickGuard(event)) return;
    event.endClickChain();
    T(true);
    F.current = clock.setTimeout(() => {
      F.current = null;
      T(false);
      onPress?.(event);
    }, MULTI_CLICK_MIN_MS);
  }
  function W(x) {
    if (x.type === "down" && x.button === 0) {
      let I = {
        col: x.col,
        row: x.row,
        hasActed: false,
      };
      k.current = I;
      T(true);
      E(I);
    } else if (x.type === "up") {
      let I = k.current;
      k.current = null;
      T(false);
      E(null);
      if (I !== null && !I.hasActed && !x.isUnreported && isNearPoint(I, x))
        onPress?.({
          row: I.row,
        });
    }
  }
  let L = l === "inverse";
  let backgroundColor = L ? undefined : A ? "text" : C ? USER_MESSAGE_BACKGROUND : undefined;
  let [G = "", ...g] = children;
  return jsxProd_default_2(Box, {
    paddingLeft: paddingX,
    flexShrink: 1,
    alignSelf: "flex-start",
    backgroundColor,
    onClick: B && !repeat ? U : undefined,
    onPointer: B && repeat ? W : undefined,
    onMouseEnter: B ? () => h(true) : undefined,
    onMouseLeave: B ? () => h(false) : undefined,
    hoverFollowsPaint: B,
    noSelect: true,
    children: [
      jsxProd_default(Text, {
        color: A && !L ? "inverseText" : undefined,
        dimColor: !A,
        inverse: A && L,
        wrap: "truncate-end",
        children:
          C && !A && L
            ? jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(Text, {
                    inverse: true,
                    children: G,
                  }),
                  g.join(""),
                ],
              })
            : children,
      }),
      paddingX > 0 &&
        B &&
        jsxProd_default(Box, {
          width: paddingX,
          flexShrink: 1000,
        }),
    ],
  });
}
//@ chunk-r68xwcze.js:2584-2596 placement
var HIGHLIGHT_REFRESH_MS = 1000;
//@ chunk-r68xwcze.js:2596-2877 placement
function useStrayClickFilter() {
  let t = w(2);
  let clock = useClock();
  let i;
  if (t[0] !== clock) {
    i = () => {
      let a = {
        at: Number.NEGATIVE_INFINITY,
        row: -1,
      };
      return {
        pressed: (f) => {
          a = {
            at: clock.now(),
            row: f.row,
          };
        },
        dropsClick: (m) => {
          if (m.row !== a.row || clock.now() - a.at >= HIGHLIGHT_REFRESH_MS) {
            return false;
          }
          m.dropAsStray();
          return true;
        },
      };
    };
    t[0] = clock;
    t[1] = i;
  } else i = t[1];
  let [l] = y(i);
  return l;
}
//@ chunk-r68xwcze.js:2877-2896 placement
/**
 * 恒为 false 的焦点 context（没有真实焦点时的默认值）。
 */
var NO_FOCUS_CONTEXT = qt(() => false);
//@ chunk-r68xwcze.js:2896-3162 placement
function MoreItemsIndicator(props) {
  let l = w(3);
  let { direction, count, onPress } = props;
  if (count <= 0) {
    return null;
  }
  const children = `${direction === "above" ? UP_ARROW : DOWN_ARROW} ${count} more`;
  let C;
  if (l[0] !== onPress || l[1] !== children) {
    C = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default(ScrollArrowButton, {
        paddingX: 1,
        onPress,
        children,
      }),
    });
    l[0] = onPress;
    l[1] = children;
    l[2] = C;
  } else C = l[2];
  return C;
}
//@ chunk-r68xwcze.js:3162-3166 placement
init_react_production();
//@ chunk-r68xwcze.js:3166-3170 placement
init_react_production();
//@ chunk-r68xwcze.js:3170-3270 placement
function useHoverTrackingEnabled() {
  let o = Se(AlternateScreenContext);
  let { subscribeHoverTracked, isHoverTracked } = Se(kp);
  let a = yt(subscribeHoverTracked, isHoverTracked);
  return o ?? a;
}
//@ chunk-r68xwcze.js:3270-3274 placement
init_react_production();
//@ chunk-r68xwcze.js:3274-3283 placement
var MIN_SCROLLBAR_ROWS = 5;
//@ chunk-r68xwcze.js:3283-6052 placement
/**
 * 列表滚动条（偏移、可见数、点击/拖动滚动）。
 */
function ScrollBar(props) {
  let N = w(50);
  let { offset, visible, total, height, onScrollTo, onScrollBy, arrows } = props;
  let h = height === undefined ? visible : height;
  let A = arrows === undefined ? false : arrows;
  let T = R(null);
  let [k, M] = y(false);
  let [E, F] = y(false);
  let B = onScrollTo !== undefined;
  let U;
  let W;
  if (N[0] !== B) {
    U = () => {
      if (!B && T.current !== null && T.current.jump !== null) T.current = null;
    };
    W = [B];
    N[0] = B;
    N[1] = U;
    N[2] = W;
  } else {
    U = N[1];
    W = N[2];
  }
  P(U, W);
  if (total <= visible || h < 1) {
    return null;
  }
  let L = A && h >= MIN_SCROLLBAR_ROWS;
  let H = L ? h - 2 : h;
  let G;
  if (N[3] !== H || N[4] !== offset || N[5] !== total || N[6] !== visible) {
    G = computeScrollThumb({
      offset,
      visible,
      total,
      height: H,
    });
    N[3] = H;
    N[4] = offset;
    N[5] = total;
    N[6] = visible;
    N[7] = G;
  } else G = N[7];
  let { top, size } = G;
  let I = H - top - size;
  let V;
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
        T.current = null;
        M(false);
        if (b !== null && b.jump !== null && !p.isUnreported && isNearPoint(b.jump, p))
          K(
            {
              ...b,
              asked: offset,
            },
            p.row,
            false,
          );
        return;
      }
      if (p.type === "down" && p.button === 0) {
        let ee = p.localRow >= top && p.localRow < top + size;
        let q = {
          trackRow: p.row - p.localRow,
          visible,
          total,
          height: H,
          grab: ee ? p.localRow - top : Math.floor(size / 2),
          asked: offset,
          jump: ee
            ? null
            : {
                col: p.col,
                row: p.row,
              },
        };
        T.current = q;
        M(true);
        if (ee) K(q, p.row, true);
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
      K(b, p.row, false);
    };
    function K(D, row, oe) {
      let d = scrollOffsetFromThumbTop({
        top: row - D.trackRow - D.grab,
        visible: D.visible,
        total: D.total,
        height: D.height,
      });
      let v = d >= D.total - D.visible ? D.total - Math.min(D.visible, visible) : d;
      if (v === D.asked) {
        return;
      }
      D.asked = v;
      if (!oe) onScrollTo?.(v);
    }
    N[8] = H;
    N[9] = offset;
    N[10] = onScrollTo;
    N[11] = size;
    N[12] = top;
    N[13] = total;
    N[14] = visible;
    N[15] = V;
  } else V = N[15];
  let color = E || k ? "suggestion" : undefined;
  let re;
  if (N[16] !== L || N[17] !== offset || N[18] !== onScrollBy) {
    re =
      L &&
      jsxProd_default(ScrollArrowButton, {
        repeat: true,
        onPress: onScrollBy && offset > 0 ? () => onScrollBy(-1) : undefined,
        children: UP_ARROW,
      });
    N[16] = L;
    N[17] = offset;
    N[18] = onScrollBy;
    N[19] = re;
  } else re = N[19];
  const onPointer = onScrollTo || k ? V : undefined;
  let onMouseEnter;
  if (N[20] !== onScrollTo) {
    onMouseEnter = onScrollTo && (() => F(true));
    N[20] = onScrollTo;
    N[21] = onMouseEnter;
  } else onMouseEnter = N[21];
  let onMouseLeave;
  if (N[22] !== onScrollTo) {
    onMouseLeave = onScrollTo && (() => F(false));
    N[22] = onScrollTo;
    N[23] = onMouseLeave;
  } else onMouseLeave = N[23];
  let X;
  if (N[24] !== top) {
    X =
      top > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: repeatCharLines(_S.pipe, top),
      });
    N[24] = top;
    N[25] = X;
  } else X = N[25];
  let children;
  if (N[26] !== size) {
    children = repeatCharLines(HEAVY_VERTICAL_BAR_GLYPH, size);
    N[26] = size;
    N[27] = children;
  } else children = N[27];
  let ce;
  if (N[28] !== children || N[29] !== color) {
    ce = jsxProd_default(Text, {
      color,
      children,
    });
    N[28] = children;
    N[29] = color;
    N[30] = ce;
  } else ce = N[30];
  let Q;
  if (N[31] !== I) {
    Q =
      I > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: repeatCharLines(_S.pipe, I),
      });
    N[31] = I;
    N[32] = Q;
  } else Q = N[32];
  let he;
  if (
    N[33] !== X ||
    N[34] !== ce ||
    N[35] !== Q ||
    N[36] !== onPointer ||
    N[37] !== onMouseEnter ||
    N[38] !== onMouseLeave
  ) {
    he = jsxProd_default_2(NoSelect, {
      flexDirection: "column",
      flexShrink: 0,
      onPointer,
      onMouseEnter,
      onMouseLeave,
      children: [X, ce, Q],
    });
    N[33] = X;
    N[34] = ce;
    N[35] = Q;
    N[36] = onPointer;
    N[37] = onMouseEnter;
    N[38] = onMouseLeave;
    N[39] = he;
  } else he = N[39];
  let be;
  if (N[40] !== L || N[41] !== offset || N[42] !== onScrollBy || N[43] !== total || N[44] !== visible) {
    be =
      L &&
      jsxProd_default(ScrollArrowButton, {
        repeat: true,
        onPress: onScrollBy && offset < total - visible ? () => onScrollBy(1) : undefined,
        children: DOWN_ARROW,
      });
    N[40] = L;
    N[41] = offset;
    N[42] = onScrollBy;
    N[43] = total;
    N[44] = visible;
    N[45] = be;
  } else be = N[45];
  let Re;
  if (N[46] !== he || N[47] !== be || N[48] !== re) {
    Re = jsxProd_default(Decorative, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [re, he, be],
      }),
    });
    N[46] = he;
    N[47] = be;
    N[48] = re;
    N[49] = Re;
  } else Re = N[49];
  return Re;
}
//@ chunk-r68xwcze.js:6052-6302 placement
function computeScrollThumb({ offset, visible, total, height }) {
  let f = clamp(Math.round((visible / total) * height), 1, Math.max(1, height - 1));
  let m = height - f;
  let l = total - visible;
  if (offset <= 0)
    return {
      top: 0,
      size: f,
    };
  if (offset >= l)
    return {
      top: m,
      size: f,
    };
  let rounded = Math.round((offset / l) * m);
  if (m < 2)
    return {
      top: rounded,
      size: f,
    };
  return {
    top: clamp(rounded, 1, m - 1),
    size: f,
  };
}
//@ chunk-r68xwcze.js:6302-6509 placement
function scrollOffsetFromThumbTop({ top, visible, total, height }) {
  let { size } = computeScrollThumb({
    offset: 0,
    visible,
    total,
    height,
  });
  let m = height - size;
  let l = total - visible;
  if (top <= 0) return 0;
  if (top >= m) return l;
  let rounded = Math.round((top / m) * l);
  if (l < 2) return rounded;
  return clamp(rounded, 1, l - 1);
}
//@ chunk-r68xwcze.js:6509-6572 placement
function repeatCharLines(pipe, t) {
  return Array.from(
    {
      length: t,
    },
    () => pipe,
  ).join(`
`);
}
//@ chunk-r68xwcze.js:6572-7150 placement
function SelectRow(props) {
  let h = w(12);
  let { bar, height, children } = props;
  let [f, m] = y(false);
  let hoverTrackingEnabled = useHoverTrackingEnabled();
  if (f && !hoverTrackingEnabled) m(false);
  let C = hoverTrackingEnabled && bar.total > bar.visible;
  let onMouseEnter;
  let onMouseLeave;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => m(true);
    onMouseLeave = () => m(false);
    h[0] = onMouseEnter;
    h[1] = onMouseLeave;
  } else {
    onMouseEnter = h[0];
    onMouseLeave = h[1];
  }
  let k;
  if (h[2] !== children) {
    k = jsxProd_default(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children,
    });
    h[2] = children;
    h[3] = k;
  } else k = h[3];
  let M;
  if (h[4] !== bar || h[5] !== C || h[6] !== height || h[7] !== f) {
    M =
      C &&
      (f
        ? jsxProd_default(ScrollBar, {
            ...bar,
            height,
          })
        : jsxProd_default(Box, {
            width: 1,
            flexShrink: 0,
          }));
    h[4] = bar;
    h[5] = C;
    h[6] = height;
    h[7] = f;
    h[8] = M;
  } else M = h[8];
  let E;
  if (h[9] !== k || h[10] !== M) {
    E = jsxProd_default_2(Box, {
      gap: 1,
      onMouseEnter,
      onMouseLeave,
      children: [k, M],
    });
    h[9] = k;
    h[10] = M;
    h[11] = E;
  } else E = h[11];
  return E;
}
//@ chunk-r68xwcze.js:7150-7154 placement
init_react_production();
//@ chunk-r68xwcze.js:7154-7158 placement
init_react_production();
//@ chunk-r68xwcze.js:7158-7320 placement
/**
 * 按聚焦下标、总数、窗口高度（及可选锚点）算可见窗口 [windowStart, windowEnd) 以及上下各隐藏多少项。
 */
function computeScrollWindow(o, t, i, a = null) {
  let f = clamp(a === null ? o - i + 1 : clamp(a, o - i + 1, o), 0, Math.max(0, t - i));
  let min = Math.min(f + i, t);
  return {
    windowStart: f,
    windowEnd: min,
    moreAbove: f,
    moreBelow: t - min,
  };
}
//@ chunk-r68xwcze.js:7320-7335 placement
var EMPTY_HEADINGS = new Set();
//@ chunk-r68xwcze.js:7335-9252 placement
function useLineScroll({
  lineCount,
  visibleCount,
  cursorLine,
  getCursorLine,
  headings = EMPTY_HEADINGS,
  boundaries,
  markerLines = 0,
  onScroll,
}) {
  let max = Math.max(0, lineCount - 1);
  let A = clamp(cursorLine, 0, max);
  let T = () => clamp(getCursorLine(), 0, max);
  let [k, M, E] = useLatestState(null);
  let F = visibleCount + 2 * markerLines;
  let B = 0;
  while (B < lineCount && headings.has(B)) B++;
  let N = lineCount - 1;
  while (N >= 0 && headings.has(N)) N--;
  function U(d, v) {
    return (d > B ? markerLines : 0) + (v <= N ? markerLines : 0);
  }
  function W(d) {
    return d <= 0 || d >= lineCount || boundaries === undefined || boundaries.has(d) || headings.has(d);
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
  for (let idx = lineCount - 1; idx >= 0; idx--)
    if (H(idx) && g(idx) < lineCount) {
      x = G(idx, 1);
      break;
    }
  function I(d) {
    let v = g(d);
    return headings.has(v - 1) && v < lineCount;
  }
  function V(d) {
    let v = g(d);
    for (let u = d; u < v; u++) if (!headings.has(u)) return true;
    return false;
  }
  function p(d, v) {
    let u = d;
    while (!W(u)) u--;
    let re = L(u);
    let ne = re > N ? lineCount : re;
    let min = Math.min(u, x);
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
  let b = p(A, k);
  let K = g(b);
  P(() => {
    if (k !== null && k !== b) M(b);
  }, [k, b, M]);
  function ee(d) {
    let v = p(T(), E());
    let u = clamp(d, 0, x);
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
    let Y = ne;
    let _ = g(ne);
    while (Y < _ && p(Y, ne) !== ne) Y++;
    while (_ > Y && p(_ - 1, ne) !== ne) _--;
    onScroll?.(Y, _);
  }
  function q(d) {
    let v = p(T(), E());
    for (let idx = 0; idx < Math.abs(d); idx++) v = G(v, d < 0 ? -1 : 1);
    if (d !== 0) ee(v);
  }
  let D = K - b >= lineCount;
  let J = D ? 0 : Math.max(0, F - U(b, K) - K + b);
  let oe = K - b + J;
  return {
    windowStart: b,
    windowEnd: K,
    spareLines: J,
    fits: D,
    getWindow: () => {
      let d = p(T(), E());
      return {
        windowStart: d,
        windowEnd: g(d),
      };
    },
    scrollBy: q,
    scrollTo: ee,
    pin: () => M(p(T(), E())),
    bar: {
      offset: b,
      visible: oe,
      total: lineCount,
      onScrollTo: D ? undefined : (d) => ee(d + oe >= lineCount ? x : d),
      onScrollBy: D ? undefined : q,
    },
  };
}
//@ chunk-r68xwcze.js:9252-12200 placement
/**
 * 管理选择列表光标、可见窗口、行高与分组标题。
 */
function useSelectCursor({
  count,
  visibleCount,
  headingLines,
  rowHeights,
  moreRowLines = false,
  rowKeys,
  resetKey,
  initialCursor = 0,
  isDisabled = false,
  onAccept,
  onRowKeyDown,
  onCursorChange,
  edge = "clamp",
  onUpFromFirstItem,
  onDownFromLastItem,
  declineHomeEnd = false,
  keybindingContext = "Select",
}) {
  let U = R(null);
  let max = Math.max(0, count - 1);
  let [L, H, G] = useLatestState(() => {
    let c = clamp(initialCursor, 0, max);
    return {
      index: c,
      key: rowKeys?.[c],
      resetKey,
    };
  });
  let hasFocus = useHasFocus(U);
  let { focusDirection } = useFocus();
  let I = isDisabledValue(isDisabled);
  function V(c) {
    if (!Object.is(c.resetKey, resetKey)) return 0;
    let O = clamp(c.index, 0, max);
    if (c.key === undefined || rowKeys?.[O] === c.key) return O;
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
        : {
            index: c,
            key: rowKeys?.[c],
            resetKey,
          },
    );
  }
  let ee = new Set(headingLines);
  let size = ee.size;
  for (let idx = 0; idx < count; idx++) size += rowHeights?.[idx] ?? 1;
  let D = [];
  let J = [0];
  let oe = new Set();
  for (let idx = 0, O = 0; idx < size; idx++) {
    if (idx >= O) {
      oe.add(idx);
      if (!ee.has(idx)) {
        O = idx + (rowHeights?.[D.length] ?? 1);
        D.push(idx);
      }
    }
    J.push(D.length);
  }
  let markerLines = moreRowLines ? 1 : 0;
  function v(c) {
    X((O) => {
      let le = O + c;
      if (edge === "wrap" && count > 0) return ((le % count) + count) % count;
      return clamp(le, 0, max);
    });
  }
  function u(c) {
    if (lineScroll.fits) return false;
    if (visibleCount === 1) {
      v(c);
      return;
    }
    X((O) => {
      let le = lineScroll.getWindow();
      let ue = clamp((D[O] ?? 0) + c * (le.windowEnd - le.windowStart), 0, size - 1);
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
    if (declineHomeEnd && lineScroll.fits) return false;
    X(c);
  }
  P(() => {
    if (G() === L) K(p);
  });
  let Y = Oo((c) => onCursorChange?.(c));
  let _ = R(null);
  P(() => {
    if (count === 0) {
      _.current = null;
      return;
    }
    if (_.current !== p) {
      _.current = p;
      Y(p);
    }
  }, [p, count]);
  function X(c) {
    let O = clamp(typeof c === "function" ? c(b()) : c, 0, max);
    K(O);
    if (count === 0 || O === _.current) return;
    _.current = O;
    onCursorChange?.(O);
  }
  MessageActionsKeybindings(
    xr(
      {
        "select:next": () => re(1),
        "select:previous": () => re(-1),
        "select:pageDown": () => u(1),
        "select:pageUp": () => u(-1),
        "select:first": () => ne(0),
        "select:last": () => ne(max),
      },
      (c) => () => (isDisabledValue(isDisabled) ? false : c()),
    ),
    {
      context: keybindingContext,
      isActive: hasFocus && !I && count > 0,
    },
  );
  MessageActionsKeybindings(
    {
      "select:accept": () => (isDisabledValue(isDisabled) ? false : onAccept?.(b())),
    },
    {
      context: keybindingContext,
      isActive: hasFocus && !I && count > 0 && onAccept !== undefined,
    },
  );
  let te = useKeybindingContext() !== null;
  function ce(event) {
    if (isDisabledValue(isDisabled) || count === 0) return;
    let O = b();
    if (event.key === "return" && onAccept && !te) {
      onAccept(O);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onRowKeyDown?.(event, O);
  }
  let lineScroll = useLineScroll({
    lineCount: size,
    visibleCount,
    cursorLine: D[p] ?? 0,
    getCursorLine: () => D[b()] ?? 0,
    headings: ee,
    boundaries: oe,
    markerLines,
    onScroll: (c, O) => {
      let le = b();
      let ue = J[c] ?? 0;
      let _e = (J[O] ?? count) - 1;
      X(ue > _e ? le : clamp(le, ue, _e));
    },
  });
  function he(event) {
    if (event.deltaY === 0 || isDisabledValue(isDisabled)) return;
    lineScroll.scrollBy(event.deltaY > 0 ? 1 : -1);
    event.stopImmediatePropagation();
  }
  function be(c, O = false) {
    if (!O && isDisabledValue(isDisabled)) return;
    lineScroll.scrollTo(c < 0 ? 0 : size);
  }
  function Re(c) {
    lineScroll.pin();
    X(clamp(c, 0, max));
  }
  return {
    cursor: p,
    windowStart: lineScroll.windowStart,
    windowEnd: lineScroll.windowEnd,
    spareLines: lineScroll.spareLines,
    moreAbove: J[lineScroll.windowStart] ?? 0,
    moreBelow: count - (J[lineScroll.windowEnd] ?? count),
    isCursor: (c) => c === p && count > 0,
    hasFocus,
    scrollBar: {
      ...lineScroll.bar,
      onScrollTo: I ? undefined : lineScroll.bar.onScrollTo,
      onScrollBy: I ? undefined : lineScroll.bar.onScrollBy,
    },
    setCursor: Re,
    scrollToEdge: be,
    containerRef: U,
    bind: {
      ref: U,
      tabIndex: 0,
      onKeyDown: ce,
      onWheel: !I && !lineScroll.fits ? he : undefined,
    },
  };
}
//@ chunk-r68xwcze.js:12200-12255 placement
/**
 * 把 isDisabled 属性定为布尔：函数则调用，true 即视为禁用。
 */
function isDisabledValue(isDisabled) {
  return typeof isDisabled === "function" ? isDisabled() : isDisabled === true;
}
//@ chunk-r68xwcze.js:12255-12296 placement
function labelValueOption(label, value) {
  return {
    label,
    value,
  };
}
//@ chunk-r68xwcze.js:12296-12326 placement
function addNumbers(ne, Y) {
  return ne + Y;
}
//@ chunk-r68xwcze.js:12326-12350 placement
var MIN_MENU_ROWS = 3;
var MIN_MENU_ROWS_HALF = 7;
var MENU_OPEN_CONTEXT = qt(false);
//@ chunk-r68xwcze.js:12350-12378 placement
/**
 * 当前菜单是否处于展开态（读 Eo context）。
 */
function isMenuOpen() {
  return Se(MENU_OPEN_CONTEXT);
}
//@ chunk-r68xwcze.js:12378-13751 placement
function SelectGroup(props) {
  let f = w(27);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { onFocus, onSelect } = props;
  if (isScreenReaderEnabled && onSelect !== undefined) {
    let m;
    let l;
    if (f[0] !== props.children) {
      l = [];
      m = new Map();
      for (const C of Fy.toArray(props.children)) {
        if (!isGroupHeading(C)) {
          l.push(C);
          continue;
        }
        m.set(l.length, [...(m.get(l.length) ?? []), C]);
      }
      f[0] = props.children;
      f[1] = m;
      f[2] = l;
    } else {
      m = f[1];
      l = f[2];
    }
    if (l.length === 0) {
      let h;
      if (f[3] !== props.emptyMessage) {
        h = props.emptyMessage
          ? jsxProd_default(Text, {
              children: props.emptyMessage,
            })
          : null;
        f[3] = props.emptyMessage;
        f[4] = h;
      } else h = f[4];
      return h;
    }
    let onKeyDown;
    if (f[5] !== props.isDisabled) {
      onKeyDown = (event) => {
        if (isDisabledValue(props.isDisabled) || event.ctrl || event.meta) {
          return;
        }
        if (event.key === "return" || event.key === " ") event.stopPropagation();
      };
      f[5] = props.isDisabled;
      f[6] = onKeyDown;
    } else onKeyDown = f[6];
    let options;
    if (f[7] !== l) {
      options = l.map(labelValueOption);
      f[7] = l;
      f[8] = options;
    } else options = f[8];
    let isDisabled;
    if (f[9] !== props.isDisabled) {
      isDisabled = isDisabledValue(props.isDisabled);
      f[9] = props.isDisabled;
      f[10] = isDisabled;
    } else isDisabled = f[10];
    let onChange;
    if (f[11] !== onFocus || f[12] !== onSelect) {
      onChange = (E) => {
        onFocus?.(E);
        onSelect(E);
      };
      f[11] = onFocus;
      f[12] = onSelect;
      f[13] = onChange;
    } else onChange = f[13];
    let children;
    if (f[14] !== m || f[15] !== onFocus || f[16] !== options || f[17] !== isDisabled || f[18] !== onChange) {
      children = jsxProd_default(Select, {
        options,
        headings: m,
        drawLabels: true,
        isDisabled,
        onFocus,
        onChange,
      });
      f[14] = m;
      f[15] = onFocus;
      f[16] = options;
      f[17] = isDisabled;
      f[18] = onChange;
      f[19] = children;
    } else children = f[19];
    let B;
    if (f[20] !== onKeyDown || f[21] !== children) {
      B = jsxProd_default(Box, {
        flexDirection: "column",
        onKeyDown,
        children,
      });
      f[20] = onKeyDown;
      f[21] = children;
      f[22] = B;
    } else B = f[22];
    return B;
  }
  if (props.visibleCount === undefined) {
    let h;
    if (f[23] !== props) {
      h = jsxProd_default(SelectContainer, {
        ...props,
      });
      f[23] = props;
      f[24] = h;
    } else h = f[24];
    return h;
  }
  let h;
  if (f[25] !== props) {
    h = jsxProd_default(useSelectState, {
      props,
      visibleCount: props.visibleCount,
    });
    f[25] = props;
    f[26] = h;
  } else h = f[26];
  return h;
}
//@ chunk-r68xwcze.js:13751-15571 placement
function SelectContainer(o) {
  let h = w(21);
  let scrollColumnContext = useScrollColumnContext();
  let i = Se(ContextSlotA);
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let l = i !== null && !hasScrollViewport;
  let C = R(null);
  let A;
  if (h[0] !== l || h[1] !== scrollColumnContext) {
    A = () => {
      let T = C.current;
      if (T === null) {
        return null;
      }
      let k = scrollColumnContext?.box.current ?? T;
      while (scrollColumnContext === null && !l && k.parentNode !== undefined) k = k.parentNode;
      return measureElement(k).height - measureElement(T).height;
    };
    h[0] = l;
    h[1] = scrollColumnContext;
    h[2] = A;
  } else A = h[2];
  let measured = useMeasured(A);
  let E;
  if (h[3] !== i || h[4] !== scrollColumnContext?.box.current) {
    E = () => {
      let F = scrollColumnContext?.box.current ?? C.current;
      let B = i === null ? null : i();
      return F === null || B === null ? null : B + measureElement(F).height;
    };
    h[3] = i;
    h[4] = scrollColumnContext?.box.current;
    h[5] = E;
  } else E = h[5];
  let measured_2 = useMeasured(E);
  let U = Se(contextSlot);
  let W;
  if (h[6] !== o.children || h[7] !== o.emptyMessage) {
    let L = Fy.toArray(o.children);
    W = L.every(isGroupHeading)
      ? Number(Boolean(o.emptyMessage))
      : L.map(optionLineCount).reduce(addNumbers, 0);
    h[6] = o.children;
    h[7] = o.emptyMessage;
    h[8] = W;
  } else W = h[8];
  let H = W;
  let G = o.maxVisibleCount === undefined ? H : Math.min(H, o.maxVisibleCount);
  let g;
  let x;
  if (h[9] !== U || h[10] !== l || h[11] !== G) {
    g = () =>
      l
        ? U?.({
            rows: () => (C.current === null ? G : measureElement(C.current).height),
            owed: G,
          })
        : undefined;
    x = [l, U, G];
    h[9] = U;
    h[10] = l;
    h[11] = G;
    h[12] = g;
    h[13] = x;
  } else {
    g = h[12];
    x = h[13];
  }
  zt(g, x);
  let I;
  if (h[14] === MEMO_CACHE_SENTINEL) {
    I = () => (C.current === null ? 0 : measureElement(C.current).width);
    h[14] = I;
  } else I = h[14];
  let measured_3 = useMeasured(I);
  let [p, b] = y(null);
  let K = hasScrollViewport ? (scrollColumnContext?.rows ?? rows) : terminalSize.rows;
  let ee = p?.rows === K && p.width === measured_3;
  if (measured !== null && (p === null || !ee || measured > p.chrome))
    b({
      rows: K,
      width: measured_3,
      chrome: measured,
    });
  let q = ee ? Math.max(p.chrome, measured ?? p.chrome) : measured;
  let D = hasScrollViewport
    ? K
    : l
      ? measured_2
      : terminalSize.rows - (scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS);
  let J =
    q === null || D === null
      ? MIN_MENU_ROWS
      : hasScrollViewport || l
        ? D - q
        : Math.min(Math.max(MIN_MENU_ROWS_HALF, Math.floor(terminalSize.rows / 2)), D - q);
  let oe = o.maxVisibleCount === undefined ? J : Math.min(J, o.maxVisibleCount);
  let max = Math.max(1, oe);
  let overflowHint =
    max === 1
      ? "none"
      : max < MIN_MENU_ROWS && o.overflowHint !== "none"
        ? "glyph"
        : o.overflowHint === "count"
          ? undefined
          : o.overflowHint;
  let props;
  if (h[15] !== overflowHint || h[16] !== o) {
    props = {
      ...o,
      overflowHint,
    };
    h[15] = overflowHint;
    h[16] = o;
    h[17] = props;
  } else props = h[17];
  let re;
  if (h[18] !== max || h[19] !== props) {
    re = jsxProd_default(Box, {
      ref: C,
      flexDirection: "column",
      children: jsxProd_default(useSelectState, {
        props,
        visibleCount: max,
      }),
    });
    h[18] = max;
    h[19] = props;
    h[20] = re;
  } else re = h[20];
  return re;
}
//@ chunk-r68xwcze.js:15571-18622 placement
/**
 * 选择列表的状态与按键处理（默认焦点、禁用项、选择）。
 */
function useSelectState({
  props: {
    children,
    defaultFocusIndex,
    resetKey,
    onSelect,
    onFocus,
    onRowKeyDown,
    isDisabled,
    onDisabledRowClick,
    wrap = false,
    onUpFromFirstItem,
    onDownFromLastItem,
    declineHomeEnd = false,
    keybindingContext,
    overflowHint,
    scrollBar = true,
    emptyMessage,
    hoverStyle,
    rowClick = "select",
    styled = false,
  },
  visibleCount,
}) {
  let H = Fy.toArray(children);
  let G = [];
  let g = 0;
  for (let z of H) {
    G.push(optionLineCount(z));
    g += G.at(-1) ?? 1;
  }
  let x = overflowHint === undefined && g > visibleCount;
  let I = x ? Math.max(1, visibleCount - 2) : visibleCount;
  let V = x && I === visibleCount - 2;
  let p = [];
  let b = [];
  let K = [];
  let ee = [];
  let q = [];
  let D = 0;
  for (let [z, de] of H.entries()) {
    ee.push(b.length);
    q.push(D);
    if (isGroupHeading(de)) {
      p.push(D++);
      continue;
    }
    b.push(Math.min(G[z] ?? 1, I));
    K.push(isValidElement_default(de) ? (de.key ?? undefined) : undefined);
    D += b.at(-1) ?? 1;
  }
  let J = b.length;
  let oe = isDisabledValue(isDisabled);
  let d = R(null);
  let { containerRef, ...u } = useSelectCursor({
    count: J,
    visibleCount: I,
    moreRowLines: V,
    headingLines: p,
    rowHeights: b,
    rowKeys: K,
    resetKey,
    initialCursor: defaultFocusIndex,
    isDisabled,
    edge: wrap ? "wrap" : "clamp",
    onUpFromFirstItem,
    onDownFromLastItem,
    declineHomeEnd,
    keybindingContext,
    onAccept: onSelect,
    onRowKeyDown,
    onCursorChange: (z) => {
      d.current = {
        cursor: z,
        count: J,
      };
      onFocus?.(z);
    },
  });
  let re = Oo((z) => onFocus?.(z));
  P(() => {
    let z = d.current;
    if (J === 0 || (z?.cursor === u.cursor && z.count === J)) return;
    d.current = {
      cursor: u.cursor,
      count: J,
    };
    re(u.cursor);
  }, [u.cursor, J]);
  useFocusOnMount(containerRef, !oe);
  let strayClickGuard = useStrayClickGuard();
  let strayClickFilter = useStrayClickFilter();
  let _ = (z) => strayClickGuard(z) || strayClickFilter.dropsClick(z);
  if (J === 0)
    return jsxProd_default(Box, {
      ref: containerRef,
      flexDirection: "column",
      tabIndex: 0,
      children:
        emptyMessage &&
        jsxProd_default(Text, {
          dimColor: true,
          children: emptyMessage,
        }),
    });
  let X =
    overflowHint === undefined || (overflowHint === "glyph" && visibleCount === 1) ? "count" : overflowHint;
  let { windowStart, windowEnd, moreAbove, moreBelow } = u;
  let flattened = H.flatMap((child, de) => {
    let xe = q[de] ?? 0;
    return xe >= windowStart && xe < windowEnd
      ? [
          {
            child,
            index: de,
            line: xe,
          },
        ]
      : [];
  });
  let Re = (z) =>
    oe && onDisabledRowClick === undefined
      ? undefined
      : (de) => {
          u.scrollToEdge(z, oe);
          strayClickFilter.pressed(de);
          if (oe) onDisabledRowClick?.(d.current?.cursor ?? u.cursor);
        };
  let c =
    X === "count" &&
    jsxProd_default(MoreItemsIndicator, {
      direction: "above",
      count: moreAbove,
      onPress: Re(-1),
    });
  let O =
    X === "count" &&
    jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count: moreBelow,
      onPress: Re(1),
    });
  let mapped = flattened.map(({ child, index, line }, Ko) => {
    let _o = isValidElement_default(child) ? (child.key ?? line) : line;
    let Vo = Ko === 0 && moreAbove > 0;
    let zo = Ko === flattened.length - 1 && moreBelow > 0;
    if (isGroupHeading(child))
      return jsxProd_default(
        ListItem,
        {
          isFocused: false,
          showScrollUp: X === "glyph" && Vo,
          showScrollDown: X === "glyph" && zo,
          styled: false,
          children: child,
        },
        _o,
      );
    let ve = ee[index] ?? 0;
    let Go = u.isCursor(ve);
    return jsxProd_default(
      MENU_OPEN_CONTEXT.Provider,
      {
        value: Go && !oe,
        children: jsxProd_default(Box, {
          flexDirection: "column",
          height: b[ve],
          overflow: "hidden",
          onClick:
            oe && onDisabledRowClick !== undefined
              ? (ge) => {
                  if (ge.droppedAsStray || _(ge)) return;
                  u.setCursor(ve);
                  onDisabledRowClick(ve);
                }
              : rowClick === "move" && !oe && onSelect !== undefined
                ? (ge) => {
                    if (ge.droppedAsStray || _(ge) || isDisabledValue(isDisabled)) return;
                    u.setCursor(ve);
                  }
                : undefined,
          children: jsxProd_default(ListItem, {
            isFocused: Go,
            idle: oe,
            showScrollUp: X === "glyph" && Vo,
            showScrollDown: X === "glyph" && zo,
            styled,
            hoverStyle,
            declareCursor: !oe && groupItemProps(child)?.declareCursor !== false,
            onClick:
              oe || onSelect === undefined || rowClick === "move"
                ? undefined
                : (ge) => {
                    if (_(ge) || isDisabledValue(isDisabled)) return;
                    u.setCursor(ve);
                    onSelect(ve);
                  },
            children: child,
          }),
        }),
      },
      _o,
    );
  });
  let ue =
    u.spareLines > 0 &&
    jsxProd_default(Box, {
      flexShrink: 0,
      height: u.spareLines,
    });
  if (!scrollBar)
    return jsxProd_default(NO_FOCUS_CONTEXT, {
      value: strayClickFilter.dropsClick,
      children: jsxProd_default_2(WindowedText, {
        windowStart,
        ...u.bind,
        children: [c, mapped, ue, O],
      }),
    });
  let _e = jsxProd_default_2(WindowedText, {
    windowStart,
    children: [mapped, ue],
  });
  return jsxProd_default(NO_FOCUS_CONTEXT, {
    value: strayClickFilter.dropsClick,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      ...u.bind,
      children: [
        V ? null : c,
        jsxProd_default_2(SelectRow, {
          bar: V
            ? {
                ...u.scrollBar,
                arrows: true,
              }
            : u.scrollBar,
          height: V ? visibleCount : undefined,
          children: [V ? c : null, _e, V ? O : null],
        }),
        V ? null : O,
      ],
    }),
  });
}
//@ chunk-r68xwcze.js:18622-18732 placement
function SelectGroupItem(props) {
  let i = w(2);
  let { children } = props;
  let a;
  if (i[0] !== children) {
    a = jsxProd_default(Fragment, {
      children,
    });
    i[0] = children;
    i[1] = a;
  } else a = i[1];
  return a;
}
//@ chunk-r68xwcze.js:18732-18842 placement
function SelectGroupHeading(props) {
  let i = w(2);
  let { children } = props;
  let a;
  if (i[0] !== children) {
    a = jsxProd_default(Fragment, {
      children,
    });
    i[0] = children;
    i[1] = a;
  } else a = i[1];
  return a;
}
//@ chunk-r68xwcze.js:18842-18883 placement
function isGroupHeading(o) {
  return isValidElement_default(o) && o.type === SelectGroupHeading;
}
//@ chunk-r68xwcze.js:18883-18974 placement
function optionLineCount(o) {
  let lines = groupItemProps(o)?.lines ?? 1;
  return Number.isFinite(lines) ? Math.max(1, Math.trunc(lines)) : 1;
}
//@ chunk-r68xwcze.js:18974-19030 placement
function groupItemProps(o) {
  return isValidElement_default(o) && o.type === SelectGroupItem ? o.props : undefined;
}
//@ chunk-r68xwcze.js:19030-19076 placement
var merged = Object.assign(SelectGroup, {
  Item: SelectGroupItem,
  Heading: SelectGroupHeading,
});
//@ chunk-r68xwcze.js:19076-19105 placement
function newSet() {
  return new Set();
}
//@ chunk-r68xwcze.js:19105-19202 placement
function cursorIndexFor(q) {
  if (!isOrderedListItem(q)) {
    return 0;
  }
  let { icon } = q.props;
  return isValidElement_default(icon) && icon.type === StatusIcon
    ? maxStatusIconWidth()
    : bunStringWidth(reactNodeText(icon));
}
//@ chunk-r68xwcze.js:19202-19250 fingerprint = getTextContent (0.673)
function getTextContent(node) {
  return metaTexts(node.props.meta).length > 0;
}
//@ chunk-ey2qag4x.js:43084-43088 placement
init_react_production();
//@ chunk-ey2qag4x.js:43088-43459 placement
/**
 * 选择列表的鼠标滚轮处理（选项未全部可见时滚动）。
 */
function useSelectWheel({
  isDisabled,
  visibleFromIndex,
  visibleToIndex,
  optionCount,
  scrollViewport,
  shouldDropWheel,
}) {
  let d = R(null);
  if (isDisabled || visibleToIndex - visibleFromIndex >= optionCount)
    return {
      ref: d,
      onWheel: undefined,
    };
  return {
    ref: d,
    onWheel: (event) => {
      if (event.deltaY === 0 || shouldDropWheel()) return;
      let c = d.current;
      if (
        c !== null &&
        event.col !== undefined &&
        event.row !== undefined &&
        hitTest(c, event.col, event.row) === null
      )
        return;
      if (scrollViewport(event.deltaY > 0 ? 1 : -1)) event.stopImmediatePropagation();
    },
  };
}
//@ chunk-ey2qag4x.js:43459-43500 layout = _temp7 (1)
function isInputOption(opt) {
  return opt.type === "input";
}
//@ chunk-ey2qag4x.js:43500-43538 file-local
function hasDescription(opt) {
  return opt.description;
}
//@ chunk-ey2qag4x.js:43538-43579 layout = _temp (1)
function isImagePaste(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43579-43620 layout = _temp (1)
function isImagePaste_2(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43620-43650 layout
function boldTextStyle() {
  return {
    bold: true,
  };
}
//@ chunk-ey2qag4x.js:43650-43691 layout = _temp (1)
function isImagePaste_3(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43691-43732 layout = _temp (1)
function isImagePaste_4(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43732-43773 layout = _temp (1)
function isImagePaste_5(c) {
  return c.type === "image";
}
//@ chunk-ey2qag4x.js:43773-43807 placement
/**
 * 选择列表"尚未提交选择"的哨兵值。
 */
var NO_COMMITTED_ROW = Symbol("NO_COMMITTED_ROW");
//@ chunk-ey2qag4x.js:44614-57659 fingerprint = Select (0.772)
/**
 * 通用单选：按 layout 渲染选项（可带描述、两栏、数字前缀），useSelectState 管理焦点与视口，支持 input 类型选项（就地编辑）、onFocus/onChange/onCancel。
 */
function Select_2(props) {
  let $ = w(89);
  let {
    isDisabled,
    hideIndexes,
    disablePrintableKeybindings,
    visibleOptionCount,
    hiddenBelowUnit,
    highlightText,
    options,
    columnSizingOptions,
    defaultValue,
    selectedValue,
    onCancel,
    onChange,
    onFocus,
    defaultFocusValue,
    layout,
    disableSelection,
    inlineDescriptions,
    hoverStyle,
    inputChromeWidth,
    onUpFromFirstItem,
    onDownFromLastItem,
    onInputModeToggle,
    onOpenEditor,
    canPasteImage,
    onImagePaste,
    pastedContents,
    onRemoveImage,
    pointerWhileDisabled,
  } = props;
  let Y = isDisabled === undefined ? false : isDisabled;
  let J = hideIndexes === undefined ? false : hideIndexes;
  let ye = disablePrintableKeybindings === undefined ? false : disablePrintableKeybindings;
  let fe = visibleOptionCount === undefined ? 5 : visibleOptionCount;
  let ee = columnSizingOptions === undefined ? options : columnSizingOptions;
  let O = layout === undefined ? "compact" : layout;
  let xe = disableSelection === undefined ? false : disableSelection;
  let U = inlineDescriptions === undefined ? false : inlineDescriptions;
  let extraChromeWidth = inputChromeWidth === undefined ? 0 : inputChromeWidth;
  let X = pointerWhileDisabled === undefined ? false : pointerWhileDisabled;
  let [imagesSelected, setImagesSelected] = y(false);
  let [selectedImageIndex, setSelectedImageIndex] = y(0);
  let t7;
  if ($[0] !== options) {
    t7 = () => {
      let initialMap = new Map();
      options.forEach((option) => {
        if (option.type === "input" && option.initialValue) initialMap.set(option.value, option.initialValue);
      });
      return initialMap;
    };
    $[0] = options;
    $[1] = t7;
  } else t7 = $[1];
  let [inputValues, setInputValues] = y(t7);
  let t8;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t8 = new Map();
    $[2] = t8;
  } else t8 = $[2];
  let lastInitialValues = R(t8);
  let Vt;
  let Nt;
  if ($[3] !== inputValues || $[4] !== options) {
    Vt = () => {
      for (const option of options) {
        if (option.type === "input" && option.initialValue !== undefined) {
          let lastInitial = lastInitialValues.current.get(option.value) ?? "";
          let currentValue = inputValues.get(option.value) ?? "";
          let newInitial = option.initialValue;
          if (newInitial !== lastInitial && currentValue === lastInitial)
            setInputValues((prev) => {
              let next = new Map(prev);
              next.set(option.value, newInitial);
              return next;
            });
          lastInitialValues.current.set(option.value, newInitial);
        }
      }
    };
    Nt = [options, inputValues];
    $[3] = inputValues;
    $[4] = options;
    $[5] = Vt;
    $[6] = Nt;
  } else {
    Vt = $[5];
    Nt = $[6];
  }
  P(Vt, Nt);
  let ct = O === "compact" && !U && !ee.some(isInputOption) && ee.some(hasDescription);
  let { columns } = useScrollViewportSize(useTerminalSize());
  const visibleOptionCount_2 = fitVisibleOptionCount(fe, ct ? "compact-vertical" : O);
  let t11;
  if (
    $[7] !== defaultFocusValue ||
    $[8] !== defaultValue ||
    $[9] !== onCancel ||
    $[10] !== onChange ||
    $[11] !== onFocus ||
    $[12] !== options ||
    $[13] !== selectedValue ||
    $[14] !== visibleOptionCount_2
  ) {
    t11 = {
      visibleOptionCount: visibleOptionCount_2,
      options,
      defaultValue,
      selectedValue,
      onChange,
      onCancel,
      onFocus,
      focusValue: defaultFocusValue,
    };
    $[7] = defaultFocusValue;
    $[8] = defaultValue;
    $[9] = onCancel;
    $[10] = onChange;
    $[11] = onFocus;
    $[12] = options;
    $[13] = selectedValue;
    $[14] = visibleOptionCount_2;
    $[15] = t11;
  } else t11 = $[15];
  let state = useSelectState_2(t11);
  let [Ft, St] = y(true);
  let strayClickGuard = useStrayClickGuard();
  let shouldDropWheel = useIsWithinStrayWindow();
  let kt;
  if ($[16] !== xe || $[17] !== Y || $[18] !== X || $[19] !== strayClickGuard || $[20] !== state) {
    kt = (bt) =>
      (Y && !X) || xe === true || bt.disabled === true
        ? undefined
        : (on) => {
            if (strayClickGuard(on)) {
              return;
            }
            if (bt.type === "input") state.focusOption(bt.value);
            else state.onChange?.(bt.value);
          };
    $[16] = xe;
    $[17] = Y;
    $[18] = X;
    $[19] = strayClickGuard;
    $[20] = state;
    $[21] = kt;
  } else kt = $[21];
  let Ge = kt;
  const disableSelection_2 = xe || (J ? "numeric" : false);
  let onEnterImageSelection;
  if ($[22] !== pastedContents) {
    onEnterImageSelection = () => {
      if (pastedContents && Object.values(pastedContents).some(isImagePaste)) {
        let imageCount = count(Object.values(pastedContents), isImagePaste_2);
        setImagesSelected(true);
        setSelectedImageIndex(imageCount - 1);
        return true;
      }
      return false;
    };
    $[22] = pastedContents;
    $[23] = onEnterImageSelection;
  } else onEnterImageSelection = $[23];
  let onExitImageSelection;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    onExitImageSelection = () => {
      setImagesSelected(false);
    };
    $[24] = onExitImageSelection;
  } else onExitImageSelection = $[24];
  let t14;
  if (
    $[25] !== Ft ||
    $[26] !== imagesSelected ||
    $[27] !== inputValues ||
    $[28] !== Y ||
    $[29] !== onDownFromLastItem ||
    $[30] !== onInputModeToggle ||
    $[31] !== onUpFromFirstItem ||
    $[32] !== options ||
    $[33] !== state ||
    $[34] !== disableSelection_2 ||
    $[35] !== onEnterImageSelection
  ) {
    t14 = {
      isDisabled: Y,
      hasInkFocus: Ft,
      disableSelection: disableSelection_2,
      state,
      options,
      isMultiSelect: false,
      onUpFromFirstItem,
      onDownFromLastItem,
      onInputModeToggle,
      inputValues,
      imagesSelected,
      onEnterImageSelection,
      onExitImageSelection,
    };
    $[25] = Ft;
    $[26] = imagesSelected;
    $[27] = inputValues;
    $[28] = Y;
    $[29] = onDownFromLastItem;
    $[30] = onInputModeToggle;
    $[31] = onUpFromFirstItem;
    $[32] = options;
    $[33] = state;
    $[34] = disableSelection_2;
    $[35] = onEnterImageSelection;
    $[36] = t14;
  } else t14 = $[36];
  let { handleKeyDown } = useSelectInput(t14);
  let qn;
  if (
    $[37] !== canPasteImage ||
    $[38] !== options ||
    $[39] !== state.focusOption ||
    $[40] !== state.focusedValue
  ) {
    qn = {
      options,
      focusedValue: state.focusedValue,
      focusOption: state.focusOption,
      canPaste: canPasteImage,
    };
    $[37] = canPasteImage;
    $[38] = options;
    $[39] = state.focusOption;
    $[40] = state.focusedValue;
    $[41] = qn;
  } else qn = $[41];
  let onPaste = usePasteIntoInputOption(qn);
  let rn = R(null);
  useFocusOnMount(rn, !Y);
  let styles = {
    container: () => ({
      flexDirection: "column",
      ref: rn,
      ...(Y
        ? {}
        : {
            tabIndex: 0,
            textEntry: ye ? true : undefined,
            onKeyDown: handleKeyDown,
            onPaste,
            onFocus: () => St(true),
            onBlur: () => St(false),
          }),
    }),
    highlightedText: boldTextStyle,
  };
  let Ct;
  if (
    $[42] !== hiddenBelowUnit ||
    $[43] !== options.length ||
    $[44] !== state.visibleFromIndex ||
    $[45] !== state.visibleToIndex
  ) {
    Ct =
      hiddenBelowUnit !== undefined && state.visibleToIndex - state.visibleFromIndex < options.length
        ? jsxProd_default(Box, {
            paddingLeft: 3,
            height: 1,
            children: jsxProd_default(OverflowHint, {
              count: options.length - state.visibleToIndex,
              unit: hiddenBelowUnit,
            }),
          })
        : null;
    $[42] = hiddenBelowUnit;
    $[43] = options.length;
    $[44] = state.visibleFromIndex;
    $[45] = state.visibleToIndex;
    $[46] = Ct;
  } else Ct = $[46];
  let hiddenBelow = Ct;
  let ln;
  if (
    $[47] !== Y ||
    $[48] !== options.length ||
    $[49] !== shouldDropWheel ||
    $[50] !== state.scrollViewport ||
    $[51] !== state.visibleFromIndex ||
    $[52] !== state.visibleToIndex
  ) {
    ln = {
      isDisabled: Y,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel,
    };
    $[47] = Y;
    $[48] = options.length;
    $[49] = shouldDropWheel;
    $[50] = state.scrollViewport;
    $[51] = state.visibleFromIndex;
    $[52] = state.visibleToIndex;
    $[53] = ln;
  } else ln = $[53];
  let rows = useSelectWheel(ln);
  if (O === "expanded") {
    let t18;
    if ($[54] !== J || $[55] !== state.options) {
      t18 = J ? 0 : state.options.length.toString().length;
      $[54] = J;
      $[55] = state.options;
      $[56] = t18;
    } else t18 = $[56];
    let maxIndexWidth = t18;
    return jsxProd_default(WindowedRowsBox, {
      container: styles.container(),
      rows,
      hiddenBelow,
      children: state.visibleOptions.map((option, index) => {
        let isFirstVisibleOption = option.index === state.visibleFromIndex;
        let isLastVisibleOption = option.index === state.visibleToIndex - 1;
        let areMoreOptionsBelow = state.visibleToIndex < options.length;
        let areMoreOptionsAbove = state.visibleFromIndex > 0;
        let i = state.visibleFromIndex + index + 1;
        let isFocused = !Y && state.focusedValue === option.value;
        let isSelected = state.value === option.value;
        if (option.type === "input") {
          let inputValue = inputValues.has(option.value)
            ? inputValues.get(option.value)
            : option.initialValue || "";
          return jsxProd_default(
            SelectInputOption,
            {
              option,
              onClick: Ge(option),
              hoverStyle,
              isFocused,
              isSelected,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i,
              hideIndex: J,
              extraChromeWidth,
              inputValue,
              onInputChange: (value) => {
                setInputValues((prev) => {
                  let next = new Map(prev);
                  next.set(option.value, value);
                  return next;
                });
              },
              onSubmit: (value) => {
                let hasImageAttachments =
                  pastedContents && Object.values(pastedContents).some(isImagePaste_3);
                if (value.trim() || hasImageAttachments || option.allowEmptySubmitToCancel)
                  onChange?.(option.value);
                else if (!option.ignoreEmptySubmit) onCancel?.();
              },
              onExit: onCancel,
              layout: "expanded",
              showLabel: U,
              onOpenEditor,
              resetCursorOnUpdate: option.resetCursorOnUpdate,
              canPasteImage,
              onImagePaste,
              pastedContents,
              onRemoveImage,
              imagesSelected,
              selectedImageIndex,
              onImagesSelectedChange: setImagesSelected,
              onSelectedImageIndexChange: setSelectedImageIndex,
            },
            String(option.value),
          );
        }
        let label = option.label;
        if (typeof option.label === "string" && highlightText && option.label.includes(highlightText)) {
          let labelText = option.label;
          let index = labelText.indexOf(highlightText);
          label = jsxProd_default_2(Fragment, {
            children: [
              labelText.slice(0, index),
              jsxProd_default(Text, {
                ...styles.highlightedText(),
                children: highlightText,
              }),
              labelText.slice(index + highlightText.length),
            ],
          });
        }
        let isOptionDisabled = option.disabled === true;
        let optionColor = isOptionDisabled
          ? undefined
          : isSelected
            ? "success"
            : isFocused
              ? "suggestion"
              : undefined;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            flexShrink: 0,
            children: [
              jsxProd_default(SelectOption, {
                isFocused,
                isSelected,
                shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
                shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
                onClick: Ge(option),
                hoverStyle,
                children: jsxProd_default(Text, {
                  dimColor: isOptionDisabled,
                  color: optionColor,
                  children: label,
                }),
              }),
              option.description &&
                jsxProd_default(Box, {
                  paddingLeft: 2,
                  children: jsxProd_default(Text, {
                    dimColor: isOptionDisabled || option.dimDescription !== false,
                    color: optionColor,
                    children: jsxProd_default(Ansi, {
                      children: option.description,
                    }),
                  }),
                }),
              jsxProd_default(Text, {
                children: " ",
              }),
            ],
          },
          String(option.value),
        );
      }),
    });
  }
  if (O === "compact-vertical") {
    let t18;
    if ($[57] !== J || $[58] !== state.options) {
      t18 = J ? 0 : state.options.length.toString().length;
      $[57] = J;
      $[58] = state.options;
      $[59] = t18;
    } else t18 = $[59];
    let maxIndexWidth = t18;
    return jsxProd_default(WindowedRowsBox, {
      container: styles.container(),
      rows,
      hiddenBelow,
      children: state.visibleOptions.map((option, index) => {
        let isFirstVisibleOption = option.index === state.visibleFromIndex;
        let isLastVisibleOption = option.index === state.visibleToIndex - 1;
        let areMoreOptionsBelow = state.visibleToIndex < options.length;
        let areMoreOptionsAbove = state.visibleFromIndex > 0;
        let i_0 = state.visibleFromIndex + index + 1;
        let isFocused = !Y && state.focusedValue === option.value;
        let isSelected = state.value === option.value;
        if (option.type === "input") {
          let inputValue = inputValues.has(option.value)
            ? inputValues.get(option.value)
            : option.initialValue || "";
          return jsxProd_default(
            SelectInputOption,
            {
              option,
              onClick: Ge(option),
              hoverStyle,
              isFocused,
              isSelected,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i_0,
              hideIndex: J,
              extraChromeWidth,
              inputValue,
              onInputChange: (value) => {
                setInputValues((prev) => {
                  let next = new Map(prev);
                  next.set(option.value, value);
                  return next;
                });
              },
              onSubmit: (value) => {
                let hasImageAttachments =
                  pastedContents && Object.values(pastedContents).some(isImagePaste_4);
                if (value.trim() || hasImageAttachments || option.allowEmptySubmitToCancel)
                  onChange?.(option.value);
                else if (!option.ignoreEmptySubmit) onCancel?.();
              },
              onExit: onCancel,
              layout: "compact",
              showLabel: U,
              onOpenEditor,
              resetCursorOnUpdate: option.resetCursorOnUpdate,
              canPasteImage,
              onImagePaste,
              pastedContents,
              onRemoveImage,
              imagesSelected,
              selectedImageIndex,
              onImagesSelectedChange: setImagesSelected,
              onSelectedImageIndexChange: setSelectedImageIndex,
            },
            String(option.value),
          );
        }
        let label = option.label;
        if (typeof option.label === "string" && highlightText && option.label.includes(highlightText)) {
          let labelText = option.label;
          let index = labelText.indexOf(highlightText);
          label = jsxProd_default_2(Fragment, {
            children: [
              labelText.slice(0, index),
              jsxProd_default(Text, {
                ...styles.highlightedText(),
                children: highlightText,
              }),
              labelText.slice(index + highlightText.length),
            ],
          });
        }
        let isOptionDisabled = option.disabled === true;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            flexShrink: 0,
            children: [
              jsxProd_default(SelectOption, {
                isFocused,
                isSelected,
                shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
                shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
                onClick: Ge(option),
                hoverStyle,
                children: jsxProd_default_2(Fragment, {
                  children: [
                    !J &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: `${i_0}.`.padEnd(maxIndexWidth + 1),
                      }),
                    jsxProd_default(Text, {
                      dimColor: isOptionDisabled,
                      color: isOptionDisabled
                        ? undefined
                        : isSelected
                          ? "success"
                          : isFocused
                            ? "suggestion"
                            : undefined,
                      children: label,
                    }),
                  ],
                }),
              }),
              option.description &&
                jsxProd_default(Box, {
                  paddingLeft: J ? 4 : maxIndexWidth + 4,
                  children: jsxProd_default(Text, {
                    dimColor: isOptionDisabled || option.dimDescription !== false,
                    color: isOptionDisabled
                      ? undefined
                      : isSelected
                        ? "success"
                        : isFocused
                          ? "suggestion"
                          : undefined,
                    children: jsxProd_default(Ansi, {
                      children: option.description,
                    }),
                  }),
                }),
            ],
          },
          String(option.value),
        );
      }),
    });
  }
  let Ue;
  if ($[60] !== ee || $[61] !== J) {
    Ue = J ? 0 : ee.length.toString().length;
    $[60] = ee;
    $[61] = J;
    $[62] = Ue;
  } else Ue = $[62];
  let Ut = Ue;
  if (ct) {
    let Kt;
    let Xn;
    if ($[63] !== columns || $[64] !== ee || $[65] !== J || $[66] !== Ut || $[67] !== state.value) {
      Kt = J ? 0 : Ut + 2;
      let $t;
      if ($[70] !== ee || $[71] !== Kt || $[72] !== state.value) {
        let Mt;
        if ($[74] !== Kt || $[75] !== state.value) {
          Mt = (fs) => {
            if (fs.type === "input") {
              return 0;
            }
            let pf = state.value === fs.value ? 2 : 0;
            return 2 + Kt + bunStringWidth(reactNodeText(fs.label)) + pf;
          };
          $[74] = Kt;
          $[75] = state.value;
          $[76] = Mt;
        } else Mt = $[76];
        $t = Math.max(...ee.map(Mt));
        $[70] = ee;
        $[71] = Kt;
        $[72] = state.value;
        $[73] = $t;
      } else $t = $[73];
      Xn = Math.min($t, Math.floor(columns * MAX_WIDTH_RATIO));
      $[63] = columns;
      $[64] = ee;
      $[65] = J;
      $[66] = Ut;
      $[67] = state.value;
      $[68] = Kt;
      $[69] = Xn;
    } else {
      Kt = $[68];
      Xn = $[69];
    }
    let optionData = state.visibleOptions.map((option, index) => {
      let isFirstVisibleOption = option.index === state.visibleFromIndex;
      let isLastVisibleOption = option.index === state.visibleToIndex - 1;
      let areMoreOptionsBelow = state.visibleToIndex < options.length;
      let areMoreOptionsAbove = state.visibleFromIndex > 0;
      let i_1 = state.visibleFromIndex + index + 1;
      let isFocused = !Y && state.focusedValue === option.value;
      let isSelected = state.value === option.value;
      let isOptionDisabled = option.disabled === true;
      let ha = isSelected ? 2 : 0;
      let Qn = reactNodeText(option.label);
      let label_1 = option.label;
      let ba = Xn - 2 - Kt - ha;
      if (bunStringWidth(Qn) > ba) {
        Qn = truncateToWidth(Qn, ba);
        label_1 = Qn;
      }
      if (typeof label_1 === "string" && highlightText && label_1.includes(highlightText)) {
        let labelText = label_1;
        let idx = labelText.indexOf(highlightText);
        label_1 = jsxProd_default_2(Fragment, {
          children: [
            labelText.slice(0, idx),
            jsxProd_default(Text, {
              ...styles.highlightedText(),
              children: highlightText,
            }),
            labelText.slice(idx + highlightText.length),
          ],
        });
      }
      return {
        option,
        index: i_1,
        label: label_1,
        labelWidth: 2 + Kt + bunStringWidth(Qn) + ha,
        isFocused,
        isSelected,
        isOptionDisabled,
        shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
        shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
      };
    });
    const container = styles.container();
    let Mt;
    if ($[77] !== Ge || $[78] !== J || $[79] !== hoverStyle || $[80] !== Ut || $[81] !== Xn) {
      Mt = (data) => {
        if (data.option.type === "input") {
          return null;
        }
        let va = Xn - data.labelWidth;
        return jsxProd_default_2(
          SelectOptionRow,
          {
            isFocused: data.isFocused,
            shouldShowDownArrow: data.shouldShowDownArrow,
            shouldShowUpArrow: data.shouldShowUpArrow,
            onClick: Ge(data.option),
            hoverStyle,
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "row",
                flexShrink: 0,
                children: [
                  jsxProd_default(Text, {
                    children: " ",
                  }),
                  jsxProd_default_2(Text, {
                    dimColor: data.isOptionDisabled,
                    color: data.isOptionDisabled
                      ? undefined
                      : data.isSelected
                        ? "success"
                        : data.isFocused
                          ? "suggestion"
                          : undefined,
                    children: [
                      !J &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: `${data.index}.`.padEnd(Ut + 2),
                        }),
                      data.label,
                    ],
                  }),
                  data.isSelected &&
                    jsxProd_default_2(Text, {
                      children: [
                        " ",
                        jsxProd_default(StatusIcon, {
                          status: "success",
                        }),
                      ],
                    }),
                  va > 0 &&
                    jsxProd_default(Text, {
                      children: " ".repeat(va),
                    }),
                ],
              }),
              jsxProd_default(Box, {
                flexGrow: 1,
                marginLeft: 2,
                children: jsxProd_default(Text, {
                  wrap: "wrap",
                  dimColor:
                    data.option.descriptionColor === undefined &&
                    (data.isOptionDisabled || data.option.dimDescription !== false),
                  color: data.isOptionDisabled
                    ? data.option.descriptionColor
                    : data.isSelected
                      ? "success"
                      : data.isFocused
                        ? "suggestion"
                        : data.option.descriptionColor,
                  children: jsxProd_default(Ansi, {
                    children: data.option.description || " ",
                  }),
                }),
              }),
            ],
          },
          String(data.option.value),
        );
      };
      $[77] = Ge;
      $[78] = J;
      $[79] = hoverStyle;
      $[80] = Ut;
      $[81] = Xn;
      $[82] = Mt;
    } else Mt = $[82];
    return jsxProd_default(WindowedRowsBox, {
      container,
      rows,
      hiddenBelow,
      children: optionData.map(Mt),
    });
  }
  const hs = WindowedRowsBox;
  const container = styles.container();
  const children = state.visibleOptions.map((option, index) => {
    if (option.type === "input") {
      let inputValue = inputValues.has(option.value)
        ? inputValues.get(option.value)
        : option.initialValue || "";
      let isFirstVisibleOption = option.index === state.visibleFromIndex;
      let isLastVisibleOption = option.index === state.visibleToIndex - 1;
      let areMoreOptionsBelow = state.visibleToIndex < options.length;
      let areMoreOptionsAbove = state.visibleFromIndex > 0;
      let i_2 = state.visibleFromIndex + index + 1;
      let isFocused = !Y && state.focusedValue === option.value;
      let isSelected = state.value === option.value;
      return jsxProd_default(
        SelectInputOption,
        {
          option,
          onClick: Ge(option),
          hoverStyle,
          isFocused,
          isSelected,
          shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
          shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
          maxIndexWidth: Ut,
          index: i_2,
          hideIndex: J,
          extraChromeWidth,
          inputValue,
          onInputChange: (value) => {
            setInputValues((prev) => {
              let next = new Map(prev);
              next.set(option.value, value);
              return next;
            });
          },
          onSubmit: (value) => {
            let hasImageAttachments = pastedContents && Object.values(pastedContents).some(isImagePaste_5);
            if (value.trim() || hasImageAttachments || option.allowEmptySubmitToCancel)
              onChange?.(option.value);
            else if (!option.ignoreEmptySubmit) onCancel?.();
          },
          onExit: onCancel,
          layout: "compact",
          showLabel: U,
          onOpenEditor,
          resetCursorOnUpdate: option.resetCursorOnUpdate,
          canPasteImage,
          onImagePaste,
          pastedContents,
          onRemoveImage,
          imagesSelected,
          selectedImageIndex,
          onImagesSelectedChange: setImagesSelected,
          onSelectedImageIndexChange: setSelectedImageIndex,
        },
        String(option.value),
      );
    }
    let label = option.label;
    if (typeof option.label === "string" && highlightText && option.label.includes(highlightText)) {
      let labelText = option.label;
      let index = labelText.indexOf(highlightText);
      label = jsxProd_default_2(Fragment, {
        children: [
          labelText.slice(0, index),
          jsxProd_default(Text, {
            ...styles.highlightedText(),
            children: highlightText,
          }),
          labelText.slice(index + highlightText.length),
        ],
      });
    }
    let isFirstVisibleOption = option.index === state.visibleFromIndex;
    let isLastVisibleOption = option.index === state.visibleToIndex - 1;
    let areMoreOptionsBelow = state.visibleToIndex < options.length;
    let areMoreOptionsAbove = state.visibleFromIndex > 0;
    let i_3 = state.visibleFromIndex + index + 1;
    let isFocused = !Y && state.focusedValue === option.value;
    let isSelected = state.value === option.value;
    let isOptionDisabled = option.disabled === true;
    return jsxProd_default_2(
      SelectOption,
      {
        isFocused,
        isSelected,
        shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
        shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
        onClick: Ge(option),
        hoverStyle,
        children: [
          jsxProd_default_2(Box, {
            flexDirection: "row",
            flexShrink: 0,
            children: [
              !J &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: `${i_3}.`.padEnd(Ut + 2),
                }),
              jsxProd_default_2(Text, {
                dimColor: isOptionDisabled,
                color: isOptionDisabled
                  ? undefined
                  : isSelected
                    ? "success"
                    : isFocused
                      ? "suggestion"
                      : undefined,
                children: [
                  label,
                  U &&
                    option.description &&
                    jsxProd_default_2(Text, {
                      dimColor: isOptionDisabled || option.dimDescription !== false,
                      children: [" ", option.description],
                    }),
                ],
              }),
            ],
          }),
          !U &&
            option.description &&
            jsxProd_default(Box, {
              flexShrink: 99,
              marginLeft: 2,
              children: jsxProd_default(Text, {
                wrap: "wrap-trim",
                dimColor: isOptionDisabled || option.dimDescription !== false,
                color: isOptionDisabled
                  ? undefined
                  : isSelected
                    ? "success"
                    : isFocused
                      ? "suggestion"
                      : undefined,
                children: jsxProd_default(Ansi, {
                  children: option.description,
                }),
              }),
            }),
        ],
      },
      String(option.value),
    );
  });
  let wa;
  if ($[83] !== hs || $[84] !== hiddenBelow || $[85] !== rows || $[86] !== container || $[87] !== children) {
    wa = jsxProd_default(hs, {
      container,
      rows,
      hiddenBelow,
      children,
    });
    $[83] = hs;
    $[84] = hiddenBelow;
    $[85] = rows;
    $[86] = container;
    $[87] = children;
    $[88] = wa;
  } else wa = $[88];
  return wa;
}
//@ chunk-ey2qag4x.js:57659-57676 layout
/**
 * 菜单垂直装饰预留 8 行与最大宽度比例 0.6。
 */
var MENU_VERTICAL_CHROME_ROWS = 8;
var MAX_WIDTH_RATIO = 0.6;
//@ chunk-ey2qag4x.js:57676-57834 placement
/**
 * 按终端行数与布局（expanded 每项 3 行、compact 1 行、其他 2 行）算最多可见选项数，不超过 t。
 */
function fitVisibleOptionCount(t, o) {
  let i = o === undefined ? "compact" : o;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let l = i === "expanded" ? 3 : i === "compact" ? 1 : 2;
  let max = Math.max(1, Math.floor((rows - MENU_VERTICAL_CHROME_ROWS) / l));
  return Math.min(t, max);
}
//@ chunk-ey2qag4x.js:57834-58108 placement
function WindowedRowsBox(props) {
  let f = w(7);
  let { container, rows, hiddenBelow, children } = props;
  let d;
  if (f[0] !== children || f[1] !== rows) {
    d = jsxProd_default(WindowedText, {
      ...rows,
      children,
    });
    f[0] = children;
    f[1] = rows;
    f[2] = d;
  } else d = f[2];
  let u;
  if (f[3] !== container || f[4] !== hiddenBelow || f[5] !== d) {
    u = jsxProd_default_2(Box, {
      ...container,
      children: [d, hiddenBelow],
    });
    f[3] = container;
    f[4] = hiddenBelow;
    f[5] = d;
    f[6] = u;
  } else u = f[6];
  return u;
}
//@ chunk-ey2qag4x.js:58108-59296 placement
/**
 * 选择列表的一行（焦点、上下箭头、点击与悬停样式）。
 */
function SelectOptionRow(props) {
  let x = w(24);
  let { isFocused, shouldShowDownArrow, shouldShowUpArrow, onClick, hoverStyle, children } = props;
  let u = onClick !== undefined;
  let [g, c] = useHoverHighlight(u);
  let b = userMessageBackgroundMode(hoverStyle);
  let inverse = u && g && b === "inverse";
  let C;
  if (x[0] !== isFocused) {
    C = {
      line: 0,
      column: 0,
      active: isFocused,
    };
    x[0] = isFocused;
    x[1] = C;
  } else C = x[1];
  let ref = useDeclaredCursor(C);
  const backgroundColor = u && g && b === "tint" ? USER_MESSAGE_BACKGROUND : undefined;
  let onMouseEnter;
  if (x[2] !== u || x[3] !== c) {
    onMouseEnter = u ? () => c(true) : undefined;
    x[2] = u;
    x[3] = c;
    x[4] = onMouseEnter;
  } else onMouseEnter = x[4];
  let onMouseLeave;
  if (x[5] !== u || x[6] !== c) {
    onMouseLeave = u ? () => c(false) : undefined;
    x[5] = u;
    x[6] = c;
    x[7] = onMouseLeave;
  } else onMouseLeave = x[7];
  let m;
  if (
    x[8] !== u ||
    x[9] !== b ||
    x[10] !== g ||
    x[11] !== inverse ||
    x[12] !== isFocused ||
    x[13] !== shouldShowDownArrow ||
    x[14] !== shouldShowUpArrow
  ) {
    m = jsxProd_default(Box, {
      flexShrink: 0,
      children: isFocused
        ? jsxProd_default(Text, {
            color: "suggestion",
            inverse,
            children: figures_default.pointer,
          })
        : shouldShowDownArrow
          ? jsxProd_default(Text, {
              dimColor: true,
              inverse,
              children: figures_default.arrowDown,
            })
          : shouldShowUpArrow
            ? jsxProd_default(Text, {
                dimColor: true,
                inverse,
                children: figures_default.arrowUp,
              })
            : u && g && b === "pointer"
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: figures_default.pointer,
                })
              : jsxProd_default(Text, {
                  inverse,
                  children: " ",
                }),
    });
    x[8] = u;
    x[9] = b;
    x[10] = g;
    x[11] = inverse;
    x[12] = isFocused;
    x[13] = shouldShowDownArrow;
    x[14] = shouldShowUpArrow;
    x[15] = m;
  } else m = x[15];
  let W;
  if (
    x[16] !== children ||
    x[17] !== ref ||
    x[18] !== onClick ||
    x[19] !== backgroundColor ||
    x[20] !== onMouseEnter ||
    x[21] !== onMouseLeave ||
    x[22] !== m
  ) {
    W = jsxProd_default_2(Box, {
      ref,
      flexDirection: "row",
      flexShrink: 0,
      backgroundColor,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children: [m, children],
    });
    x[16] = children;
    x[17] = ref;
    x[18] = onClick;
    x[19] = backgroundColor;
    x[20] = onMouseEnter;
    x[21] = onMouseLeave;
    x[22] = m;
    x[23] = W;
  } else W = x[23];
  return W;
}
//@ chunk-8jypjjdf.js:1309-1313 placement
init_react_production();
//@ chunk-8jypjjdf.js:1313-1642 fingerprint = TwoColumnRow (0.736)
function TwoColumnRow(t0) {
  let $ = w(10);
  let active;
  let l;
  let children;
  if ($[0] !== t0) {
    ({ active, children, ...l } = t0);
    $[0] = t0;
    $[1] = active;
    $[2] = l;
    $[3] = children;
  } else {
    active = $[1];
    l = $[2];
    children = $[3];
  }
  let t1;
  if ($[4] !== active) {
    t1 = {
      line: 0,
      column: 0,
      active,
    };
    $[4] = active;
    $[5] = t1;
  } else t1 = $[5];
  let cursorRef = useDeclaredCursor(t1);
  let t2;
  if ($[6] !== l || $[7] !== children || $[8] !== cursorRef) {
    t2 = jsxProd_default(Box, {
      ...l,
      ref: cursorRef,
      children,
    });
    $[6] = l;
    $[7] = children;
    $[8] = cursorRef;
    $[9] = t2;
  } else t2 = $[9];
  return t2;
}
//@ chunk-ag5x7vhf.js:86912-87298 fingerprint = _temp4 (0.641)
/**
 * "自动模式成为默认"的状态提示组件：显示标题、说明与链接，并在显示时记为已读。
 */
function AutoModeDefaultNotice() {
  let $ = w(5);
  let { storageV5 } = useTheme_2();
  let x;
  if ($[0] !== storageV5) {
    x = () => markAutoDefaultNoticeSeen(storageV5);
    $[0] = storageV5;
    $[1] = x;
  } else x = $[1];
  useNoticeImpression(AUTO_MODE_DEFAULT, x);
  let k;
  let _;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    k = jsxProd_default(Text, {
      bold: true,
      children: AUTO_DEFAULT_NOTICE_TITLE,
    });
    _ = jsxProd_default(Text, {
      dimColor: true,
      children: AUTO_DEFAULT_NOTICE_BODY,
    });
    $[2] = k;
    $[3] = _;
  } else {
    k = $[2];
    _ = $[3];
  }
  let I;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    I = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        k,
        _,
        jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default(Link, {
            url: AUTO_DEFAULT_NOTICE_URL,
            fallback: AUTO_DEFAULT_NOTICE_URL,
            children: AUTO_DEFAULT_NOTICE_URL,
          }),
        }),
      ],
    });
    $[4] = I;
  } else I = $[4];
  return I;
}
export {
  NO_COMMITTED_ROW,
  MoreItemsIndicator,
  ScrollArrowButton,
  computeScrollWindow,
  AutoModeDefaultNotice,
  merged,
  isMenuOpen,
  fitVisibleOptionCount,
  TwoColumnRow,
  SelectRow,
  Select_2,
  useSelectWheel,
  isDisabledValue,
  NO_FOCUS_CONTEXT,
  MAX_WIDTH_RATIO,
  newSet,
  cursorIndexFor,
  getTextContent,
};
