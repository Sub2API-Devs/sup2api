/**
 * components/design-system/Tabs.tsx
 *
 * 标签页组件：Tabs/Tab，tabs:next/previous 切换、标题聚焦管理（useTabHeaderFocus）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Tabs.tsx
 * pieces: chunk-1dkfja46.js (14)
 * attribution: placement 2, callgraph-fingerprint 1, layout 6, fingerprint 4, file-local 1
 */
import { init_react_production, qt, y, Se, R, zt, Uy } from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  scrollViewportContext,
  useScrollViewportHandle,
  useClaimScrollBox,
  useScrollViewportSize,
  useHasScrollViewport,
} from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useFocus, useHasFocus } from "../../ink/components/Input.js";
import { isDescendantOf } from "../../ink/focus.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ScrollBoxDefault } from "../../ink/components/ScrollBox.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import { sequential } from "../../utils/sequential.js";
import { TagTabs } from "../TagTabs.js";

//@ chunk-1dkfja46.js:743-747 placement
init_react_production();
//@ chunk-1dkfja46.js:747-814 callgraph-fingerprint = _temp (1)
function tabEntry(child) {
  return [child.props.id ?? child.props.title, child.props.title];
}
//@ chunk-1dkfja46.js:814-842 layout
function increment_3(Qo) {
  return Qo + 1;
}
//@ chunk-1dkfja46.js:842-899 layout
function tabWidthSum(sum, t0) {
  let [, tabTitle] = t0;
  return sum + (tabTitle ? bunStringWidth(tabTitle) : 0) + 2 + 1;
}
//@ chunk-1dkfja46.js:899-925 layout
function increment_4(x) {
  return x + 1;
}
//@ chunk-1dkfja46.js:925-951 layout
function decrement(C) {
  return C - 1;
}
//@ chunk-1dkfja46.js:951-1109 fingerprint = TabsContext (0.9)
var TabsContext = qt({
  selectedTab: undefined,
  width: undefined,
  headerFocused: false,
  focusHeader: () => {},
  blurHeader: () => {},
  registerOptIn: () => () => {},
  registerNavigationOwner: () => () => {},
});
//@ chunk-1dkfja46.js:1109-5871 fingerprint = Tabs (0.674)
/**
 * 标签页：标题行（可聚焦）+ 当前标签内容，左右/tab 切换，down 把焦点移入内容；Tab 子组件声明标题。
 */
function Tabs(props) {
  let $ = w(52);
  let {
    title,
    color,
    defaultTab,
    children,
    hidden,
    useFullWidth,
    selectedTab: controlledSelectedTab,
    onTabChange,
    banner,
    disableNavigation,
    initialHeaderFocused,
    contentHeight,
    stableHeight,
    navFromContent,
  } = props;
  let K = initialHeaderFocused === undefined ? true : initialHeaderFocused;
  let p = stableHeight === undefined ? false : stableHeight;
  let navFromContent_2 = navFromContent === undefined ? false : navFromContent;
  let { columns: terminalWidth } = useTerminalSize();
  let tabs = children.map(tabEntry);
  let defaultTabIndex = defaultTab ? tabs.findIndex((tab) => defaultTab === tab[0]) : 0;
  let Ue = controlledSelectedTab !== undefined;
  let [internalSelectedTab, setInternalSelectedTab] = y(defaultTabIndex !== -1 ? defaultTabIndex : 0);
  let controlledTabIndex = Ue ? tabs.findIndex((tab) => tab[0] === controlledSelectedTab) : -1;
  let D = Ue ? (controlledTabIndex !== -1 ? controlledTabIndex : 0) : internalSelectedTab;
  let we = Se(scrollViewportContext);
  let modalScrollRef = useScrollViewportHandle();
  let claimScrollBox = useClaimScrollBox();
  let Ye = R(null);
  let [ke, So] = y(0);
  let re = R(null);
  let [xe, Io] = y(1);
  let Ut;
  if ($[0] !== ke || $[1] !== xe) {
    Ut = () => {
      let height = Ye.current ? measureElement(Ye.current).height : 0;
      if (height !== ke) So(height);
      let _t = re.current ? Math.max(1, measureElement(re.current).height) : 1;
      if (_t !== xe) Io(_t);
    };
    $[0] = ke;
    $[1] = xe;
    $[2] = Ut;
  } else Ut = $[2];
  zt(Ut);
  let ae = (hidden ? 0 : xe + 1) + ke;
  let Jt;
  let Qt;
  if ($[3] !== claimScrollBox || $[4] !== ae) {
    Jt = () => {
      if (!claimScrollBox) {
        return;
      }
      claimScrollBox(ae);
      return () => claimScrollBox(null);
    };
    Qt = [claimScrollBox, ae];
    $[3] = claimScrollBox;
    $[4] = ae;
    $[5] = Jt;
    $[6] = Qt;
  } else {
    Jt = $[5];
    Qt = $[6];
  }
  zt(Jt, Qt);
  let Xt;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Xt = {
      rows: 0,
      columns: 0,
    };
    $[7] = Xt;
  } else Xt = $[7];
  let { rows } = useScrollViewportSize(Xt);
  let M = claimScrollBox !== null && modalScrollRef !== null;
  let ref = modalScrollRef?.attach;
  let Te = M ? rows - ae : undefined;
  let Zt;
  if ($[8] !== we || $[9] !== M) {
    Zt =
      we && M
        ? {
            ...we,
            claimScrollBox: null,
          }
        : null;
    $[8] = we;
    $[9] = M;
    $[10] = Zt;
  } else Zt = $[10];
  let value = Zt;
  let wr = true;
  let le = R(null);
  let activeElementRef = R(null);
  let { focus, activeElement, focusDirection, blur } = useFocus();
  let [G, de] = y(K);
  let $t;
  if ($[11] !== activeElement || $[12] !== focus) {
    $t = () => {
      if (true && re.current) focus(re.current);
      else if (false && le.current) {
        if (activeElement && activeElement !== le.current && isDescendantOf(activeElement, le.current))
          activeElementRef.current = activeElement;
        focus(le.current);
      }
      de(true);
    };
    $[11] = activeElement;
    $[12] = focus;
    $[13] = $t;
  } else $t = $[13];
  let en = $t;
  let tn;
  if ($[14] !== blur || $[15] !== focus) {
    tn = (nn) => {
      if (true && nn) focus(nn);
      else blur();
      activeElementRef.current = null;
      de(false);
    };
    $[14] = blur;
    $[15] = focus;
    $[16] = tn;
  } else tn = $[16];
  let blurHeader = tn;
  let [B, Oo] = useNavigationHold();
  let [Mo, Wo] = useNavigationHold();
  let E = disableNavigation || Mo;
  let on = G || !B;
  let Xe = R(null);
  let hasFocus = useHasFocus(Xe);
  let Eo = true && !B ? !hasFocus : on;
  let [rn, Ao] = Uy(increment_3, 0);
  let an = R(null);
  let ln;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    ln = () => {
      activeElementRef.current = null;
    };
    $[17] = ln;
  } else ln = $[17];
  zt(ln, [D]);
  let cn = (Ze, dn) => {
    let Po = dn === undefined ? false : dn;
    an.current = {
      epoch: rn,
      index: Ze,
    };
    Ao();
    let newTabId = tabs[Ze]?.[0];
    if (Ue && onTabChange && newTabId) onTabChange(newTabId);
    else setInternalSelectedTab(Ze);
    if (Po) {
      return;
    }
    en();
  };
  let Fe = (Vo, hn) => {
    let Ko = hn === undefined ? false : hn;
    let fn = an.current;
    let Lo = fn?.epoch === rn ? fn.index : D;
    cn((Lo + tabs.length + Vo) % tabs.length, Ko);
  };
  const isActive = !hidden && !E && on;
  let t7;
  if ($[18] !== isActive) {
    t7 = {
      context: "Tabs",
      isActive,
    };
    $[18] = isActive;
    $[19] = t7;
  } else t7 = $[19];
  MessageActionsKeybindings(
    {
      "tabs:next": () => Fe(1),
      "tabs:previous": () => Fe(-1),
    },
    t7,
  );
  let t8;
  if ($[20] !== E || $[21] !== focusDirection || $[22] !== G || $[23] !== hidden || $[24] !== B) {
    t8 = (event) => {
      if (hidden || E) {
        return;
      }
      if (!G) {
        if (
          event.key === "left" ||
          event.key === "right" ||
          event.key === "tab" ||
          (B && (event.key === "up" || event.key === "down"))
        )
          event.preventDefault();
        return;
      }
      if (event.key === "left" || event.key === "right" || event.key === "tab") event.preventDefault();
      else if (event.key === "down" && B) {
        event.preventDefault();
        focusDirection("down");
        de(false);
      }
    };
    $[20] = E;
    $[21] = focusDirection;
    $[22] = G;
    $[23] = hidden;
    $[24] = B;
    $[25] = t8;
  } else t8 = $[25];
  let mn = t8;
  const isActive_2 = navFromContent_2 && !G && B && !hidden && !E;
  let t10;
  if ($[26] !== isActive_2) {
    t10 = {
      context: "Tabs",
      isActive: isActive_2,
    };
    $[26] = isActive_2;
    $[27] = t10;
  } else t10 = $[27];
  MessageActionsKeybindings(
    {
      "tabs:next": () => Fe(1, true),
      "tabs:previous": () => Fe(-1, true),
    },
    t10,
  );
  let titleWidth = title ? bunStringWidth(title) + 1 : 0;
  let tabsWidth = tabs.reduce(tabWidthSum, 0);
  let usedWidth = titleWidth + tabsWidth;
  let spacerWidth = useFullWidth ? Math.max(0, terminalWidth - usedWidth) : 0;
  let width = useFullWidth ? terminalWidth : undefined;
  const value_2 = {
    selectedTab: tabs[D][0],
    width,
    headerFocused: G,
    focusHeader: en,
    blurHeader,
    registerOptIn: Oo,
    registerNavigationOwner: Wo,
  };
  const tt = Box;
  const ref_2 = true ? undefined : le;
  const flexDirection = "column";
  const tabIndex = true ? undefined : 0;
  const autoFocus = true ? undefined : K;
  const onKeyDown = true ? undefined : mn;
  const flexShrink = modalScrollRef ? 0 : undefined;
  const lt =
    !hidden &&
    jsxProd_default_2(Box, {
      ref: re,
      tabIndex: true ? 0 : undefined,
      autoFocus: true ? K : undefined,
      onFocus: true ? () => de(true) : undefined,
      onBlur: true ? () => de(false) : undefined,
      onKeyDown: true ? mn : undefined,
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 1,
      flexShrink: modalScrollRef ? 0 : undefined,
      alignSelf: true && !useFullWidth ? "flex-start" : undefined,
      children: [
        title !== null &&
          jsxProd_default(Box, {
            flexShrink: 0,
            children: jsxProd_default(Text, {
              bold: true,
              color,
              children: title,
            }),
          }),
        tabs.map((t16, wn) => {
          let [id, Jo] = t16;
          return jsxProd_default(
            TabHeader,
            {
              title: Jo,
              isCurrent: D === wn,
              headerFocused: Eo && !E,
              color: color ?? (true ? "suggestion" : undefined),
              onClick: E ? undefined : () => cn(wn),
            },
            id,
          );
        }),
        spacerWidth > 0 &&
          jsxProd_default(Text, {
            children: " ".repeat(spacerWidth),
          }),
      ],
    });
  let Ce;
  if ($[28] !== banner) {
    Ce =
      banner != null &&
      jsxProd_default(Box, {
        ref: Ye,
        flexDirection: "column",
        flexShrink: 0,
        children: banner,
      });
    $[28] = banner;
    $[29] = Ce;
  } else Ce = $[29];
  let He;
  if (
    $[30] !== ref ||
    $[31] !== value ||
    $[32] !== children ||
    $[33] !== contentHeight ||
    $[34] !== width ||
    $[35] !== hidden ||
    $[36] !== modalScrollRef ||
    $[37] !== M ||
    $[38] !== Te ||
    $[39] !== D ||
    $[40] !== p
  ) {
    He = M
      ? jsxProd_default(Box, {
          ref: Xe,
          width,
          marginTop: hidden ? 0 : 1,
          flexShrink: 0,
          children: jsxProd_default(
            ScrollBoxDefault,
            {
              ref,
              flexDirection: "column",
              flexShrink: 0,
              height: p ? Te : undefined,
              maxHeight: p ? undefined : Te,
              stickyScroll: false,
              children: jsxProd_default(scrollViewportContext, {
                value,
                children,
              }),
            },
            D,
          ),
        })
      : jsxProd_default(Box, {
          ref: Xe,
          width,
          marginTop: hidden ? 0 : 1,
          height: p ? undefined : contentHeight,
          minHeight: p ? contentHeight : undefined,
          overflowY: contentHeight !== undefined && !p ? "hidden" : undefined,
          flexShrink: modalScrollRef ? 0 : undefined,
          children,
        });
    $[30] = ref;
    $[31] = value;
    $[32] = children;
    $[33] = contentHeight;
    $[34] = width;
    $[35] = hidden;
    $[36] = modalScrollRef;
    $[37] = M;
    $[38] = Te;
    $[39] = D;
    $[40] = p;
    $[41] = He;
  } else He = $[41];
  let children_2;
  if (
    $[42] !== tt ||
    $[43] !== ref_2 ||
    $[44] !== tabIndex ||
    $[45] !== autoFocus ||
    $[46] !== onKeyDown ||
    $[47] !== flexShrink ||
    $[48] !== lt ||
    $[49] !== Ce ||
    $[50] !== He
  ) {
    children_2 = jsxProd_default_2(tt, {
      ref: ref_2,
      flexDirection,
      tabIndex,
      autoFocus,
      onKeyDown,
      flexShrink,
      children: [lt, Ce, He],
    });
    $[42] = tt;
    $[43] = ref_2;
    $[44] = tabIndex;
    $[45] = autoFocus;
    $[46] = onKeyDown;
    $[47] = flexShrink;
    $[48] = lt;
    $[49] = Ce;
    $[50] = He;
    $[51] = children_2;
  } else children_2 = $[51];
  return jsxProd_default(TabsContext.Provider, {
    value: value_2,
    children: children_2,
  });
}
//@ chunk-1dkfja46.js:5871-6745 layout
/**
 * 单个标签页标题：当前页反色加粗，标题聚焦且有颜色时用彩色标签样式；支持点击（防误触）与悬停下划线，并声明光标位置。
 */
function TabHeader(props) {
  let $ = w(18);
  let { title, isCurrent, headerFocused, color, onClick } = props;
  let [b, x] = y(false);
  let strayClickGuard = useStrayClickGuard();
  let v = onClick !== undefined;
  const active = isCurrent && headerFocused;
  let I;
  if ($[0] !== active) {
    I = {
      line: 0,
      column: 1,
      active,
    };
    $[0] = active;
    $[1] = I;
  } else I = $[1];
  let ref = useDeclaredCursor(I);
  let Ge = sequential.level === 0;
  let K = color && isCurrent && headerFocused && !Ge;
  let onClick_2;
  if ($[2] !== onClick || $[3] !== strayClickGuard) {
    onClick_2 =
      onClick === undefined
        ? undefined
        : (jt) => {
            if (strayClickGuard(jt)) {
              return;
            }
            onClick();
          };
    $[2] = onClick;
    $[3] = strayClickGuard;
    $[4] = onClick_2;
  } else onClick_2 = $[4];
  let onMouseEnter;
  let onMouseLeave;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => x(true);
    onMouseLeave = () => x(false);
    $[5] = onMouseEnter;
    $[6] = onMouseLeave;
  } else {
    onMouseEnter = $[5];
    onMouseLeave = $[6];
  }
  let children;
  if ($[7] !== v || $[8] !== color || $[9] !== K || $[10] !== b || $[11] !== isCurrent || $[12] !== title) {
    children = K
      ? jsxProd_default(TagTabs, {
          color,
          bold: true,
          padded: true,
          children: title,
        })
      : jsxProd_default_2(Text, {
          inverse: isCurrent,
          bold: isCurrent,
          underline: b && v,
          children: [" ", title, " "],
        });
    $[7] = v;
    $[8] = color;
    $[9] = K;
    $[10] = b;
    $[11] = isCurrent;
    $[12] = title;
    $[13] = children;
  } else children = $[13];
  let ve;
  if ($[14] !== ref || $[15] !== onClick_2 || $[16] !== children) {
    ve = jsxProd_default(Box, {
      ref,
      flexShrink: 0,
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[14] = ref;
    $[15] = onClick_2;
    $[16] = children;
    $[17] = ve;
  } else ve = $[17];
  return ve;
}
//@ chunk-1dkfja46.js:6745-7010 fingerprint = Tab (1)
function Tab(props) {
  let $ = w(4);
  let { title, id, children } = props;
  let { selectedTab, width } = Se(TabsContext);
  let insideModal = useHasScrollViewport();
  if (selectedTab !== (id ?? title)) {
    return null;
  }
  const flexShrink = insideModal ? 0 : undefined;
  let t2;
  if ($[0] !== children || $[1] !== flexShrink || $[2] !== width) {
    t2 = jsxProd_default(Box, {
      width,
      flexShrink,
      children,
    });
    $[0] = children;
    $[1] = flexShrink;
    $[2] = width;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
//@ chunk-1dkfja46.js:7010-7053 file-local
function useTabsWidth() {
  let { width } = Se(TabsContext);
  return width;
}
//@ chunk-1dkfja46.js:7053-7333 fingerprint = useTabHeaderFocus (1)
function useTabHeaderFocus() {
  let $ = w(6);
  let { headerFocused, focusHeader, blurHeader, registerOptIn } = Se(TabsContext);
  let t0;
  if ($[0] !== registerOptIn) {
    t0 = [registerOptIn];
    $[0] = registerOptIn;
    $[1] = t0;
  } else t0 = $[1];
  zt(registerOptIn, t0);
  let t1;
  if ($[2] !== blurHeader || $[3] !== focusHeader || $[4] !== headerFocused) {
    t1 = {
      headerFocused,
      focusHeader,
      blurHeader,
    };
    $[2] = blurHeader;
    $[3] = focusHeader;
    $[4] = headerFocused;
    $[5] = t1;
  } else t1 = $[5];
  return t1;
}
//@ chunk-1dkfja46.js:7333-7507 layout
function useNavigationHold() {
  let $ = w(3);
  let [d, l] = y(0);
  let c;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    c = () => {
      l(increment_4);
      return () => l(decrement);
    };
    $[0] = c;
  } else c = $[0];
  let u = c;
  const t = d > 0;
  let b;
  if ($[1] !== t) {
    b = [t, u];
    $[1] = t;
    $[2] = b;
  } else b = $[2];
  return b;
}
//@ chunk-1dkfja46.js:7507-7621 placement
function useRegisterTabsNavigationOwner() {
  let l = w(2);
  let { registerNavigationOwner } = Se(TabsContext);
  let a;
  if (l[0] !== registerNavigationOwner) {
    a = [registerNavigationOwner];
    l[0] = registerNavigationOwner;
    l[1] = a;
  } else a = l[1];
  zt(registerNavigationOwner, a);
}
export { useTabsWidth, useTabHeaderFocus, Tab, Tabs, useRegisterTabsNavigationOwner };
