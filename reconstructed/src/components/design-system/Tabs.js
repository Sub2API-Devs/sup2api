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
import {
  init_react_production,
  createContext,
  useState,
  useContext,
  useRef,
  useLayoutEffect,
  useReducer,
} from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1dkfja46.js:743-747 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1dkfja46.js:743", () => {
  init_react_production();
});
//@ chunk-1dkfja46.js:747-814 callgraph-fingerprint = _temp (1)
function tabEntry(child) {
  return [child.props.id ?? child.props.title, child.props.title];
}
//@ chunk-1dkfja46.js:814-842 layout
function increment_3(index) {
  return index + 1;
}
//@ chunk-1dkfja46.js:842-899 layout
function tabWidthSum(sum, t0) {
  let [, tabTitle] = t0;
  return sum + (tabTitle ? bunStringWidth(tabTitle) : 0) + 2 + 1;
}
//@ chunk-1dkfja46.js:899-925 layout
function increment_4(index) {
  return index + 1;
}
//@ chunk-1dkfja46.js:925-951 layout
function decrement(index) {
  return index - 1;
}
//@ chunk-1dkfja46.js:951-1109 fingerprint = TabsContext (0.9)
var TabsContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1dkfja46.js:951", () => {
  TabsContext = createContext({
    selectedTab: undefined,
    width: undefined,
    headerFocused: false,
    focusHeader: () => {},
    blurHeader: () => {},
    registerOptIn: () => () => {},
    registerNavigationOwner: () => () => {},
  });
});
//@ chunk-1dkfja46.js:1109-5871 fingerprint = Tabs (0.674)
/**
 * 标签页：标题行（可聚焦）+ 当前标签内容，左右/tab 切换，down 把焦点移入内容；Tab 子组件声明标题。
 */
function Tabs(props) {
  let $ = useMemoCache(52);
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
  let headerFocusedInitially = initialHeaderFocused === undefined ? true : initialHeaderFocused;
  let useStableHeight = stableHeight === undefined ? false : stableHeight;
  let navFromContent_2 = navFromContent === undefined ? false : navFromContent;
  let { columns: terminalWidth } = useTerminalSize();
  let tabs = children.map(tabEntry);
  let defaultTabIndex = defaultTab ? tabs.findIndex((tab) => defaultTab === tab[0]) : 0;
  let isControlled = controlledSelectedTab !== undefined;
  let [internalSelectedTab, setInternalSelectedTab] = useState(defaultTabIndex !== -1 ? defaultTabIndex : 0);
  let controlledTabIndex = isControlled ? tabs.findIndex((tab) => tab[0] === controlledSelectedTab) : -1;
  let selectedIndex = isControlled
    ? controlledTabIndex !== -1
      ? controlledTabIndex
      : 0
    : internalSelectedTab;
  let outerScrollContext = useContext(scrollViewportContext);
  let modalScrollRef = useScrollViewportHandle();
  let claimScrollBox = useClaimScrollBox();
  let bannerRef = useRef(null);
  let [bannerHeight, setBannerHeight] = useState(0);
  let headerRef = useRef(null);
  let [headerHeight, setHeaderHeight] = useState(1);
  let measureEffect;
  if ($[0] !== bannerHeight || $[1] !== headerHeight) {
    measureEffect = () => {
      let height = bannerRef.current ? measureElement(bannerRef.current).height : 0;
      if (height !== bannerHeight) setBannerHeight(height);
      let measuredHeaderHeight = headerRef.current
        ? Math.max(1, measureElement(headerRef.current).height)
        : 1;
      if (measuredHeaderHeight !== headerHeight) setHeaderHeight(measuredHeaderHeight);
    };
    $[0] = bannerHeight;
    $[1] = headerHeight;
    $[2] = measureEffect;
  } else measureEffect = $[2];
  useLayoutEffect(measureEffect);
  let chromeRows = (hidden ? 0 : headerHeight + 1) + bannerHeight;
  let claimHeightEffect;
  let claimHeightDeps;
  if ($[3] !== claimScrollBox || $[4] !== chromeRows) {
    claimHeightEffect = () => {
      if (!claimScrollBox) {
        return;
      }
      claimScrollBox(chromeRows);
      return () => claimScrollBox(null);
    };
    claimHeightDeps = [claimScrollBox, chromeRows];
    $[3] = claimScrollBox;
    $[4] = chromeRows;
    $[5] = claimHeightEffect;
    $[6] = claimHeightDeps;
  } else {
    claimHeightEffect = $[5];
    claimHeightDeps = $[6];
  }
  useLayoutEffect(claimHeightEffect, claimHeightDeps);
  let zeroScrollSize;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    zeroScrollSize = {
      rows: 0,
      columns: 0,
    };
    $[7] = zeroScrollSize;
  } else zeroScrollSize = $[7];
  let { rows } = useScrollViewportSize(zeroScrollSize);
  let usesModalScroll = claimScrollBox !== null && modalScrollRef !== null;
  let ref = modalScrollRef?.attach;
  let contentRows = usesModalScroll ? rows - chromeRows : undefined;
  let innerScrollContext;
  if ($[8] !== outerScrollContext || $[9] !== usesModalScroll) {
    innerScrollContext =
      outerScrollContext && usesModalScroll
        ? {
            ...outerScrollContext,
            claimScrollBox: null,
          }
        : null;
    $[8] = outerScrollContext;
    $[9] = usesModalScroll;
    $[10] = innerScrollContext;
  } else innerScrollContext = $[10];
  let value = innerScrollContext;
  let alwaysTrue = true;
  let wrapperRef = useRef(null);
  let activeElementRef = useRef(null);
  let { focus, activeElement, focusDirection, blur } = useFocus();
  let [isHeaderFocused, setIsHeaderFocused] = useState(headerFocusedInitially);
  let focusHeaderEffect;
  if ($[11] !== activeElement || $[12] !== focus) {
    focusHeaderEffect = () => {
      if (true && headerRef.current) focus(headerRef.current);
      else if (false && wrapperRef.current) {
        if (
          activeElement &&
          activeElement !== wrapperRef.current &&
          isDescendantOf(activeElement, wrapperRef.current)
        )
          activeElementRef.current = activeElement;
        focus(wrapperRef.current);
      }
      setIsHeaderFocused(true);
    };
    $[11] = activeElement;
    $[12] = focus;
    $[13] = focusHeaderEffect;
  } else focusHeaderEffect = $[13];
  let focusHeader = focusHeaderEffect;
  let blurHandlerCached;
  if ($[14] !== blur || $[15] !== focus) {
    blurHandlerCached = (target) => {
      if (true && target) focus(target);
      else blur();
      activeElementRef.current = null;
      setIsHeaderFocused(false);
    };
    $[14] = blur;
    $[15] = focus;
    $[16] = blurHandlerCached;
  } else blurHandlerCached = $[16];
  let blurHeader = blurHandlerCached;
  let [isNavigating, beginNavigation] = useNavigationHold();
  let [isNavigationLocked, setNavigationLocked] = useNavigationHold();
  let navigationLocked = disableNavigation || isNavigationLocked;
  let navigationEnabled = isHeaderFocused || !isNavigating;
  let containerRef = useRef(null);
  let hasFocus = useHasFocus(containerRef);
  let headerHasFocus = true && !isNavigating ? !hasFocus : navigationEnabled;
  let [stateEpoch, bumpEpoch] = useReducer(increment_3, 0);
  let lastSelectionRef = useRef(null);
  let resetSelectionEffect;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    resetSelectionEffect = () => {
      activeElementRef.current = null;
    };
    $[17] = resetSelectionEffect;
  } else resetSelectionEffect = $[17];
  useLayoutEffect(resetSelectionEffect, [selectedIndex]);
  let selectTab = (index, skipFocus) => {
    let shouldSkipFocus = skipFocus === undefined ? false : skipFocus;
    lastSelectionRef.current = {
      epoch: stateEpoch,
      index,
    };
    bumpEpoch();
    let newTabId = tabs[index]?.[0];
    if (isControlled && onTabChange && newTabId) onTabChange(newTabId);
    else setInternalSelectedTab(index);
    if (shouldSkipFocus) {
      return;
    }
    focusHeader();
  };
  let stepTab = (step, skipFocus) => {
    let shouldSkipFocus = skipFocus === undefined ? false : skipFocus;
    let lastSelection = lastSelectionRef.current;
    let currentIndex = lastSelection?.epoch === stateEpoch ? lastSelection.index : selectedIndex;
    selectTab((currentIndex + tabs.length + step) % tabs.length, shouldSkipFocus);
  };
  const isActive = !hidden && !navigationLocked && navigationEnabled;
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
      "tabs:next": () => stepTab(1),
      "tabs:previous": () => stepTab(-1),
    },
    t7,
  );
  let t8;
  if (
    $[20] !== navigationLocked ||
    $[21] !== focusDirection ||
    $[22] !== isHeaderFocused ||
    $[23] !== hidden ||
    $[24] !== isNavigating
  ) {
    t8 = (event) => {
      if (hidden || navigationLocked) {
        return;
      }
      if (!isHeaderFocused) {
        if (
          event.key === "left" ||
          event.key === "right" ||
          event.key === "tab" ||
          (isNavigating && (event.key === "up" || event.key === "down"))
        )
          event.preventDefault();
        return;
      }
      if (event.key === "left" || event.key === "right" || event.key === "tab") event.preventDefault();
      else if (event.key === "down" && isNavigating) {
        event.preventDefault();
        focusDirection("down");
        setIsHeaderFocused(false);
      }
    };
    $[20] = navigationLocked;
    $[21] = focusDirection;
    $[22] = isHeaderFocused;
    $[23] = hidden;
    $[24] = isNavigating;
    $[25] = t8;
  } else t8 = $[25];
  let headerKeyDown = t8;
  const isActive_2 = navFromContent_2 && !isHeaderFocused && isNavigating && !hidden && !navigationLocked;
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
      "tabs:next": () => stepTab(1, true),
      "tabs:previous": () => stepTab(-1, true),
    },
    t10,
  );
  let titleWidth = title ? bunStringWidth(title) + 1 : 0;
  let tabsWidth = tabs.reduce(tabWidthSum, 0);
  let usedWidth = titleWidth + tabsWidth;
  let spacerWidth = useFullWidth ? Math.max(0, terminalWidth - usedWidth) : 0;
  let width = useFullWidth ? terminalWidth : undefined;
  const value_2 = {
    selectedTab: tabs[selectedIndex][0],
    width,
    headerFocused: isHeaderFocused,
    focusHeader,
    blurHeader,
    registerOptIn: beginNavigation,
    registerNavigationOwner: setNavigationLocked,
  };
  const BoxComponent = Box;
  const ref_2 = true ? undefined : wrapperRef;
  const flexDirection = "column";
  const tabIndex = true ? undefined : 0;
  const autoFocus = true ? undefined : headerFocusedInitially;
  const onKeyDown = true ? undefined : headerKeyDown;
  const flexShrink = modalScrollRef ? 0 : undefined;
  const headerRowElement =
    !hidden &&
    jsxProd_default_2(Box, {
      ref: headerRef,
      tabIndex: true ? 0 : undefined,
      autoFocus: true ? headerFocusedInitially : undefined,
      onFocus: true ? () => setIsHeaderFocused(true) : undefined,
      onBlur: true ? () => setIsHeaderFocused(false) : undefined,
      onKeyDown: true ? headerKeyDown : undefined,
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
        tabs.map((t16, index) => {
          let [id, tabTitle] = t16;
          return jsxProd_default(
            TabHeader,
            {
              title: tabTitle,
              isCurrent: selectedIndex === index,
              headerFocused: headerHasFocus && !navigationLocked,
              color: color ?? (true ? "suggestion" : undefined),
              onClick: navigationLocked ? undefined : () => selectTab(index),
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
  let bannerElement;
  if ($[28] !== banner) {
    bannerElement =
      banner != null &&
      jsxProd_default(Box, {
        ref: bannerRef,
        flexDirection: "column",
        flexShrink: 0,
        children: banner,
      });
    $[28] = banner;
    $[29] = bannerElement;
  } else bannerElement = $[29];
  let contentElement;
  if (
    $[30] !== ref ||
    $[31] !== value ||
    $[32] !== children ||
    $[33] !== contentHeight ||
    $[34] !== width ||
    $[35] !== hidden ||
    $[36] !== modalScrollRef ||
    $[37] !== usesModalScroll ||
    $[38] !== contentRows ||
    $[39] !== selectedIndex ||
    $[40] !== useStableHeight
  ) {
    contentElement = usesModalScroll
      ? jsxProd_default(Box, {
          ref: containerRef,
          width,
          marginTop: hidden ? 0 : 1,
          flexShrink: 0,
          children: jsxProd_default(
            ScrollBoxDefault,
            {
              ref,
              flexDirection: "column",
              flexShrink: 0,
              height: useStableHeight ? contentRows : undefined,
              maxHeight: useStableHeight ? undefined : contentRows,
              stickyScroll: false,
              children: jsxProd_default(scrollViewportContext, {
                value,
                children,
              }),
            },
            selectedIndex,
          ),
        })
      : jsxProd_default(Box, {
          ref: containerRef,
          width,
          marginTop: hidden ? 0 : 1,
          height: useStableHeight ? undefined : contentHeight,
          minHeight: useStableHeight ? contentHeight : undefined,
          overflowY: contentHeight !== undefined && !useStableHeight ? "hidden" : undefined,
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
    $[37] = usesModalScroll;
    $[38] = contentRows;
    $[39] = selectedIndex;
    $[40] = useStableHeight;
    $[41] = contentElement;
  } else contentElement = $[41];
  let children_2;
  if (
    $[42] !== BoxComponent ||
    $[43] !== ref_2 ||
    $[44] !== tabIndex ||
    $[45] !== autoFocus ||
    $[46] !== onKeyDown ||
    $[47] !== flexShrink ||
    $[48] !== headerRowElement ||
    $[49] !== bannerElement ||
    $[50] !== contentElement
  ) {
    children_2 = jsxProd_default_2(BoxComponent, {
      ref: ref_2,
      flexDirection,
      tabIndex,
      autoFocus,
      onKeyDown,
      flexShrink,
      children: [headerRowElement, bannerElement, contentElement],
    });
    $[42] = BoxComponent;
    $[43] = ref_2;
    $[44] = tabIndex;
    $[45] = autoFocus;
    $[46] = onKeyDown;
    $[47] = flexShrink;
    $[48] = headerRowElement;
    $[49] = bannerElement;
    $[50] = contentElement;
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
  let $ = useMemoCache(18);
  let { title, isCurrent, headerFocused, color, onClick } = props;
  let [isHovered, setIsHovered] = useState(false);
  let strayClickGuard = useStrayClickGuard();
  let isClickable = onClick !== undefined;
  const active = isCurrent && headerFocused;
  let cursorOptions;
  if ($[0] !== active) {
    cursorOptions = {
      line: 0,
      column: 1,
      active,
    };
    $[0] = active;
    $[1] = cursorOptions;
  } else cursorOptions = $[1];
  let ref = useDeclaredCursor(cursorOptions);
  let isTopLevel = sequential.level === 0;
  let useTagStyle = color && isCurrent && headerFocused && !isTopLevel;
  let onClick_2;
  if ($[2] !== onClick || $[3] !== strayClickGuard) {
    onClick_2 =
      onClick === undefined
        ? undefined
        : (event) => {
            if (strayClickGuard(event)) {
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
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    $[5] = onMouseEnter;
    $[6] = onMouseLeave;
  } else {
    onMouseEnter = $[5];
    onMouseLeave = $[6];
  }
  let children;
  if (
    $[7] !== isClickable ||
    $[8] !== color ||
    $[9] !== useTagStyle ||
    $[10] !== isHovered ||
    $[11] !== isCurrent ||
    $[12] !== title
  ) {
    children = useTagStyle
      ? jsxProd_default(TagTabs, {
          color,
          bold: true,
          padded: true,
          children: title,
        })
      : jsxProd_default_2(Text, {
          inverse: isCurrent,
          bold: isCurrent,
          underline: isHovered && isClickable,
          children: [" ", title, " "],
        });
    $[7] = isClickable;
    $[8] = color;
    $[9] = useTagStyle;
    $[10] = isHovered;
    $[11] = isCurrent;
    $[12] = title;
    $[13] = children;
  } else children = $[13];
  let headerElement;
  if ($[14] !== ref || $[15] !== onClick_2 || $[16] !== children) {
    headerElement = jsxProd_default(Box, {
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
    $[17] = headerElement;
  } else headerElement = $[17];
  return headerElement;
}
//@ chunk-1dkfja46.js:6745-7010 fingerprint = Tab (1)
function Tab(props) {
  let $ = useMemoCache(4);
  let { title, id, children } = props;
  let { selectedTab, width } = useContext(TabsContext);
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
  let { width } = useContext(TabsContext);
  return width;
}
//@ chunk-1dkfja46.js:7053-7333 fingerprint = useTabHeaderFocus (1)
function useTabHeaderFocus() {
  let $ = useMemoCache(6);
  let { headerFocused, focusHeader, blurHeader, registerOptIn } = useContext(TabsContext);
  let t0;
  if ($[0] !== registerOptIn) {
    t0 = [registerOptIn];
    $[0] = registerOptIn;
    $[1] = t0;
  } else t0 = $[1];
  useLayoutEffect(registerOptIn, t0);
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
  let $ = useMemoCache(3);
  let [holdCount, setHoldCount] = useState(0);
  let holdCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    holdCached = () => {
      setHoldCount(increment_4);
      return () => setHoldCount(decrement);
    };
    $[0] = holdCached;
  } else holdCached = $[0];
  let beginHold = holdCached;
  const isHeld = holdCount > 0;
  let holdResult;
  if ($[1] !== isHeld) {
    holdResult = [isHeld, beginHold];
    $[1] = isHeld;
    $[2] = holdResult;
  } else holdResult = $[2];
  return holdResult;
}
//@ chunk-1dkfja46.js:7507-7621 placement
function useRegisterTabsNavigationOwner() {
  let $ = useMemoCache(2);
  let { registerNavigationOwner } = useContext(TabsContext);
  let registerDeps;
  if ($[0] !== registerNavigationOwner) {
    registerDeps = [registerNavigationOwner];
    $[0] = registerNavigationOwner;
    $[1] = registerDeps;
  } else registerDeps = $[1];
  useLayoutEffect(registerNavigationOwner, registerDeps);
}
export { useTabsWidth, useTabHeaderFocus, Tab, Tabs, useRegisterTabsNavigationOwner };
