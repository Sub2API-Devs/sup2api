/**
 * components/design-system/FuzzyPicker.tsx
 *
 * 模糊搜索选择器：搜索框 + 结果列表（可反向从底部排列），无结果提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/FuzzyPicker.tsx
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 1, sole-consumer 2, affinity 1, fingerprint 2, file-local 1
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { clamp } from "../../ink/screen.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { SearchBox } from "../SearchBox.js";
import { KeyboardShortcutHint } from "./KeyboardShortcutHint.js";
import { Byline } from "./Byline.js";
import { Pane } from "./Pane.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { HintText } from "./HintText.js";
import { ListItem } from "./ListItem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:664190-664194 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:664190", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:675323-675347 sole-consumer
function returnFalse_4() {
  return false;
}
//@ chunk-czq1j3j2.js:675347-675363 sole-consumer
function noop_3() {}
//@ chunk-czq1j3j2.js:675363-675386 affinity
var DEFAULT_VISIBLE_COUNT = 8;
var PICKER_CHROME_ROWS = 10;
var MIN_VISIBLE_COUNT = 2;
//@ chunk-czq1j3j2.js:675386-681927 fingerprint (2.1.88 match: FuzzyPicker, 0.812)
/**
 * 模糊搜索选择器：顶部（或底部）搜索框，按查询过滤并高亮，上下选择，回车确认，Esc 取消，无结果显示 "No results"。
 */
function FuzzyPicker(props) {
  let $ = useMemoCache(115);
  let {
    title,
    placeholder,
    initialQuery,
    items,
    getKey,
    renderItem,
    renderPreview,
    previewPosition,
    visibleCount,
    direction,
    onQueryChange,
    onSelect,
    onTab,
    onFocus,
    onCancel,
    resetKey,
    emptyMessage,
    matchLabel,
    selectAction,
    cancelAction,
    extraHints,
  } = props;
  let placeholder_2 = placeholder === undefined ? "Type to search\u2026" : placeholder;
  let previewSide = previewPosition === undefined ? "bottom" : previewPosition;
  let visibleCountLimit = visibleCount === undefined ? DEFAULT_VISIBLE_COUNT : visibleCount;
  let navDirection = direction === undefined ? "down" : direction;
  let emptyMessageValue = emptyMessage === undefined ? "No results" : emptyMessage;
  let selectHintAction = selectAction === undefined ? "select" : selectAction;
  let action = cancelAction === undefined ? "cancel" : cancelAction;
  let isTerminalFocused = useTerminalFocus();
  let { rows, columns } = useTerminalSize();
  let initialPickerState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialPickerState = {
      focus: 0,
      window: 0,
    };
    $[0] = initialPickerState;
  } else initialPickerState = $[0];
  let [pickerState, setPickerState] = useState(initialPickerState);
  let { focus, window: windowStart } = pickerState;
  let [hoveredItem, setHoveredItem] = useState(undefined);
  let hasMatchLabel = Boolean(matchLabel);
  let visibleCount_2 = Math.max(
    MIN_VISIBLE_COUNT,
    Math.min(visibleCountLimit, rows - PICKER_CHROME_ROWS - (hasMatchLabel ? 1 : 0)),
  );
  let isNarrow = columns < 120;
  let [isItalicHint] = useState(returnFalse_4);
  let hintExtras;
  if ($[1] !== isItalicHint) {
    hintExtras = stableEmptyObject(isItalicHint);
    $[1] = isItalicHint;
    $[2] = hintExtras;
  } else hintExtras = $[2];
  let keyHintProps = hintExtras;
  let max = Math.max(0, items.length - visibleCount_2);
  let moveFocusCached;
  if ($[3] !== items.length || $[4] !== visibleCount_2) {
    moveFocusCached = (delta) => {
      setHoveredItem(undefined);
      setPickerState((previous) => {
        let { focus, window: previousWindow } = previous;
        let nextFocus = clamp(focus + delta, 0, items.length - 1);
        return {
          focus: nextFocus,
          window:
            nextFocus < previousWindow
              ? nextFocus
              : nextFocus >= previousWindow + visibleCount_2
                ? nextFocus - visibleCount_2 + 1
                : previousWindow,
        };
      });
    };
    $[3] = items.length;
    $[4] = visibleCount_2;
    $[5] = moveFocusCached;
  } else moveFocusCached = $[5];
  let moveFocus = moveFocusCached;
  let scrollWindowCached;
  if ($[6] !== max) {
    scrollWindowCached = (delta) => {
      setPickerState((delta_2) => ({
        ...delta_2,
        window: clamp(delta_2.window + delta, 0, max),
      }));
    };
    $[6] = max;
    $[7] = scrollWindowCached;
  } else scrollWindowCached = $[7];
  let scrollWindow = scrollWindowCached;
  let wheelHandlerCached;
  if ($[8] !== navDirection || $[9] !== scrollWindow) {
    wheelHandlerCached = (event) => {
      if (event.deltaY === 0) {
        return;
      }
      let isForward = event.deltaY > 0;
      if (navDirection === "up") scrollWindow(isForward ? -1 : 1);
      else scrollWindow(isForward ? 1 : -1);
      event.stopImmediatePropagation();
    };
    $[8] = navDirection;
    $[9] = scrollWindow;
    $[10] = wheelHandlerCached;
  } else wheelHandlerCached = $[10];
  let onWheel = wheelHandlerCached;
  let searchInputOptions;
  if ($[11] !== initialQuery || $[12] !== onCancel) {
    searchInputOptions = {
      isActive: true,
      onExit: noop_3,
      onCancel,
      initialQuery,
      backspaceExitsOnEmpty: false,
    };
    $[11] = initialQuery;
    $[12] = onCancel;
    $[13] = searchInputOptions;
  } else searchInputOptions = $[13];
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput(searchInputOptions);
  let keyHandlerCached;
  if (
    $[14] !== navDirection ||
    $[15] !== focus ||
    $[16] !== items ||
    $[17] !== onSelect ||
    $[18] !== onTab ||
    $[19] !== handleKeyDown ||
    $[20] !== moveFocus ||
    $[21] !== visibleCount_2
  ) {
    keyHandlerCached = (e) => {
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moveFocus(navDirection === "up" ? 1 : -1);
        return;
      }
      if (e.key === "down" || (e.ctrl && e.key === "n")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moveFocus(navDirection === "up" ? -1 : 1);
        return;
      }
      if (e.key === "pageup" || e.key === "pagedown") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let pageDirection = e.key === "pagedown" ? 1 : -1;
        moveFocus((navDirection === "up" ? -pageDirection : pageDirection) * visibleCount_2);
        return;
      }
      if (e.key === "return") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let selected = items[focus];
        if (selected) onSelect(selected);
        return;
      }
      if (e.key === "tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let selected = items[focus];
        if (onTab) onTab.handler(selected);
        else if (selected) onSelect(selected);
        return;
      }
      handleKeyDown(e);
    };
    $[14] = navDirection;
    $[15] = focus;
    $[16] = items;
    $[17] = onSelect;
    $[18] = onTab;
    $[19] = handleKeyDown;
    $[20] = moveFocus;
    $[21] = visibleCount_2;
    $[22] = keyHandlerCached;
  } else keyHandlerCached = $[22];
  let onKeyDown = keyHandlerCached;
  let queryChanged;
  if ($[23] !== onQueryChange || $[24] !== query) {
    queryChanged = () => {
      onQueryChange(query);
      setPickerState({
        focus: 0,
        window: 0,
      });
      setHoveredItem(undefined);
    };
    $[23] = onQueryChange;
    $[24] = query;
    $[25] = queryChanged;
  } else queryChanged = $[25];
  let queryDeps;
  if ($[26] !== query) {
    queryDeps = [query];
    $[26] = query;
    $[27] = queryDeps;
  } else queryDeps = $[27];
  useEffect(queryChanged, queryDeps);
  let clampPickerState;
  let clampDeps;
  if ($[28] !== items.length || $[29] !== max) {
    clampPickerState = () => {
      setPickerState((previous) => ({
        focus: clamp(previous.focus, 0, items.length - 1),
        window: clamp(previous.window, 0, max),
      }));
      setHoveredItem(undefined);
    };
    clampDeps = [items.length, max, setPickerState];
    $[28] = items.length;
    $[29] = max;
    $[30] = clampPickerState;
    $[31] = clampDeps;
  } else {
    clampPickerState = $[30];
    clampDeps = $[31];
  }
  useEffect(clampPickerState, clampDeps);
  let resetPickerState;
  let resetDeps;
  if ($[32] !== resetKey) {
    resetPickerState = () => {
      if (resetKey === undefined) {
        return;
      }
      setPickerState({
        focus: 0,
        window: 0,
      });
      setHoveredItem(undefined);
    };
    resetDeps = [resetKey, setPickerState];
    $[32] = resetKey;
    $[33] = resetPickerState;
    $[34] = resetDeps;
  } else {
    resetPickerState = $[33];
    resetDeps = $[34];
  }
  useEffect(resetPickerState, resetDeps);
  let focusedItem = items[focus];
  let activeItem = hoveredItem ?? focusedItem;
  let focusReportCached;
  if ($[35] !== onFocus || $[36] !== activeItem) {
    focusReportCached = () => {
      onFocus?.(activeItem);
    };
    $[35] = onFocus;
    $[36] = activeItem;
    $[37] = focusReportCached;
  } else focusReportCached = $[37];
  let focusReportDeps;
  if ($[38] !== activeItem) {
    focusReportDeps = [activeItem];
    $[38] = activeItem;
    $[39] = focusReportDeps;
  } else focusReportDeps = $[39];
  useEffect(focusReportCached, focusReportDeps);
  let visibleItems;
  if ($[40] !== items || $[41] !== visibleCount_2 || $[42] !== windowStart) {
    visibleItems = items.slice(windowStart, windowStart + visibleCount_2);
    $[40] = items;
    $[41] = visibleCount_2;
    $[42] = windowStart;
    $[43] = visibleItems;
  } else visibleItems = $[43];
  let visible = visibleItems;
  let emptyText;
  if ($[44] !== emptyMessageValue || $[45] !== query) {
    emptyText = typeof emptyMessageValue === "function" ? emptyMessageValue(query) : emptyMessageValue;
    $[44] = emptyMessageValue;
    $[45] = query;
    $[46] = emptyText;
  } else emptyText = $[46];
  let emptyText_2 = emptyText;
  let matchLabelElement;
  if ($[47] !== hasMatchLabel || $[48] !== matchLabel) {
    matchLabelElement = hasMatchLabel
      ? jsxProd_default(Text, {
          dimColor: true,
          children: matchLabel,
        })
      : null;
    $[47] = hasMatchLabel;
    $[48] = matchLabel;
    $[49] = matchLabelElement;
  } else matchLabelElement = $[49];
  let matchLabelRow = matchLabelElement;
  let searchBoxElement;
  if (
    $[50] !== cursorOffset ||
    $[51] !== onKeyDown ||
    $[52] !== handlePaste ||
    $[53] !== isTerminalFocused ||
    $[54] !== placeholder_2 ||
    $[55] !== query
  ) {
    searchBoxElement = jsxProd_default(SearchBox, {
      query,
      cursorOffset,
      placeholder: placeholder_2,
      isFocused: true,
      autoFocus: true,
      onKeyDown,
      onPaste: handlePaste,
      isTerminalFocused,
    });
    $[50] = cursorOffset;
    $[51] = onKeyDown;
    $[52] = handlePaste;
    $[53] = isTerminalFocused;
    $[54] = placeholder_2;
    $[55] = query;
    $[56] = searchBoxElement;
  } else searchBoxElement = $[56];
  let searchBox = searchBoxElement;
  let listElement;
  if (
    $[57] !== navDirection ||
    $[58] !== emptyText_2 ||
    $[59] !== focus ||
    $[60] !== getKey ||
    $[61] !== items.length ||
    $[62] !== onSelect ||
    $[63] !== renderItem ||
    $[64] !== visible ||
    $[65] !== visibleCount_2 ||
    $[66] !== windowStart
  ) {
    listElement = jsxProd_default(List, {
      visible,
      windowStart,
      visibleCount: visibleCount_2,
      total: items.length,
      focusedIndex: focus,
      direction: navDirection,
      getKey,
      renderItem,
      emptyText: emptyText_2,
      onItemClick: onSelect,
      onItemHover: setHoveredItem,
    });
    $[57] = navDirection;
    $[58] = emptyText_2;
    $[59] = focus;
    $[60] = getKey;
    $[61] = items.length;
    $[62] = onSelect;
    $[63] = renderItem;
    $[64] = visible;
    $[65] = visibleCount_2;
    $[66] = windowStart;
    $[67] = listElement;
  } else listElement = $[67];
  let list = listElement;
  let previewElement;
  if ($[68] !== activeItem || $[69] !== renderPreview) {
    previewElement =
      renderPreview && activeItem
        ? jsxProd_default(Box, {
            flexDirection: "column",
            flexGrow: 1,
            children: renderPreview(activeItem),
          })
        : null;
    $[68] = activeItem;
    $[69] = renderPreview;
    $[70] = previewElement;
  } else previewElement = $[70];
  let preview = previewElement;
  let bodyElement;
  if (
    $[71] !== list ||
    $[72] !== preview ||
    $[73] !== previewSide ||
    $[74] !== renderPreview ||
    $[75] !== matchLabelRow ||
    $[76] !== visibleCount_2
  ) {
    bodyElement =
      renderPreview && previewSide === "right"
        ? jsxProd_default_2(Box, {
            flexDirection: "row",
            gap: 2,
            height: visibleCount_2 + (matchLabelRow ? 1 : 0),
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                flexShrink: 0,
                children: [list, matchLabelRow],
              }),
              preview ??
                jsxProd_default(Box, {
                  flexGrow: 1,
                }),
            ],
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [list, matchLabelRow, preview],
          });
    $[71] = list;
    $[72] = preview;
    $[73] = previewSide;
    $[74] = renderPreview;
    $[75] = matchLabelRow;
    $[76] = visibleCount_2;
    $[77] = bodyElement;
  } else bodyElement = $[77];
  let body = bodyElement;
  let searchBoxFirst = navDirection !== "up";
  let titleElement;
  if ($[78] !== title) {
    titleElement = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: title,
    });
    $[78] = title;
    $[79] = titleElement;
  } else titleElement = $[79];
  const searchAboveBody = searchBoxFirst && searchBox;
  const searchBelowBody = !searchBoxFirst && searchBox;
  let chord;
  if ($[80] === MEMO_CACHE_SENTINEL) {
    chord = ["up", "down"];
    $[80] = chord;
  } else chord = $[80];
  const action_2 = isNarrow ? "nav" : "navigate";
  let navHintElement;
  if ($[81] !== keyHintProps || $[82] !== action_2) {
    navHintElement = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: action_2,
      ...keyHintProps,
    });
    $[81] = keyHintProps;
    $[82] = action_2;
    $[83] = navHintElement;
  } else navHintElement = $[83];
  let action_3;
  if ($[84] !== isNarrow || $[85] !== selectHintAction) {
    action_3 = isNarrow ? firstWord(selectHintAction) : selectHintAction;
    $[84] = isNarrow;
    $[85] = selectHintAction;
    $[86] = action_3;
  } else action_3 = $[86];
  let selectHintElement;
  if ($[87] !== keyHintProps || $[88] !== action_3) {
    selectHintElement = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: action_3,
      ...keyHintProps,
    });
    $[87] = keyHintProps;
    $[88] = action_3;
    $[89] = selectHintElement;
  } else selectHintElement = $[89];
  let tabHintElement;
  if ($[90] !== keyHintProps || $[91] !== onTab) {
    tabHintElement =
      onTab &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: onTab.action,
        ...keyHintProps,
      });
    $[90] = keyHintProps;
    $[91] = onTab;
    $[92] = tabHintElement;
  } else tabHintElement = $[92];
  let cancelHintElement;
  if ($[93] !== action || $[94] !== keyHintProps) {
    cancelHintElement = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action,
      ...keyHintProps,
    });
    $[93] = action;
    $[94] = keyHintProps;
    $[95] = cancelHintElement;
  } else cancelHintElement = $[95];
  let extraHintElements;
  if ($[96] !== extraHints || $[97] !== keyHintProps) {
    extraHintElements = extraHints?.(keyHintProps);
    $[96] = extraHints;
    $[97] = keyHintProps;
    $[98] = extraHintElements;
  } else extraHintElements = $[98];
  let children;
  if (
    $[99] !== navHintElement ||
    $[100] !== selectHintElement ||
    $[101] !== tabHintElement ||
    $[102] !== cancelHintElement ||
    $[103] !== extraHintElements
  ) {
    children = jsxProd_default_2(Byline, {
      children: [navHintElement, selectHintElement, tabHintElement, cancelHintElement, extraHintElements],
    });
    $[99] = navHintElement;
    $[100] = selectHintElement;
    $[101] = tabHintElement;
    $[102] = cancelHintElement;
    $[103] = extraHintElements;
    $[104] = children;
  } else children = $[104];
  let hintRow;
  if ($[105] !== isItalicHint || $[106] !== children) {
    hintRow = jsxProd_default(Text, {
      dimColor: true,
      italic: isItalicHint,
      children,
    });
    $[105] = isItalicHint;
    $[106] = children;
    $[107] = hintRow;
  } else hintRow = $[107];
  let pickerElement;
  if (
    $[108] !== onWheel ||
    $[109] !== body ||
    $[110] !== titleElement ||
    $[111] !== searchAboveBody ||
    $[112] !== searchBelowBody ||
    $[113] !== hintRow
  ) {
    pickerElement = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        tabIndex: -1,
        onWheel,
        children: [titleElement, searchAboveBody, body, searchBelowBody, hintRow],
      }),
    });
    $[108] = onWheel;
    $[109] = body;
    $[110] = titleElement;
    $[111] = searchAboveBody;
    $[112] = searchBelowBody;
    $[113] = hintRow;
    $[114] = pickerElement;
  } else pickerElement = $[114];
  return pickerElement;
}
//@ chunk-czq1j3j2.js:681927-683610 fingerprint (2.1.88 match: List, 0.84)
function List(props) {
  let $ = useMemoCache(38);
  let {
    visible,
    windowStart,
    visibleCount,
    total,
    focusedIndex,
    direction,
    getKey,
    renderItem,
    emptyText,
    onItemClick,
    onItemHover,
  } = props;
  let strayClickGuard = useStrayClickGuard();
  let declareCursor = useIsScreenReaderEnabled();
  if (visible.length === 0) {
    let children;
    if ($[0] !== emptyText) {
      children = jsxProd_default(HintText, {
        children: emptyText,
      });
      $[0] = emptyText;
      $[1] = children;
    } else children = $[1];
    let t2;
    if ($[2] !== children || $[3] !== visibleCount) {
      t2 = jsxProd_default(Box, {
        height: visibleCount,
        flexShrink: 0,
        children,
      });
      $[2] = children;
      $[3] = visibleCount;
      $[4] = t2;
    } else t2 = $[4];
    return t2;
  }
  let t1;
  if (
    $[5] !== direction ||
    $[6] !== focusedIndex ||
    $[7] !== getKey ||
    $[8] !== declareCursor ||
    $[9] !== onItemClick ||
    $[10] !== onItemHover ||
    $[11] !== renderItem ||
    $[12] !== strayClickGuard ||
    $[13] !== total ||
    $[14] !== visible ||
    $[15] !== visibleCount ||
    $[16] !== windowStart
  ) {
    let renderRow;
    if (
      $[18] !== direction ||
      $[19] !== focusedIndex ||
      $[20] !== getKey ||
      $[21] !== declareCursor ||
      $[22] !== onItemClick ||
      $[23] !== onItemHover ||
      $[24] !== renderItem ||
      $[25] !== strayClickGuard ||
      $[26] !== total ||
      $[27] !== visible.length ||
      $[28] !== visibleCount ||
      $[29] !== windowStart
    ) {
      renderRow = (item, i) => {
        let key = getKey(item);
        let isFocused = windowStart + i === focusedIndex;
        let atLowEdge = i === 0 && windowStart > 0;
        let atHighEdge = i === visible.length - 1 && windowStart + visibleCount < total;
        return jsxProd_default(
          ListItem,
          {
            isFocused,
            declareCursor,
            showScrollUp: direction === "up" ? atHighEdge : atLowEdge,
            showScrollDown: direction === "up" ? atLowEdge : atHighEdge,
            styled: false,
            onClick: (event) => {
              if (strayClickGuard(event)) {
                return;
              }
              onItemClick(item);
            },
            onHoverChange: (isHovered) => isHovered && onItemHover(item),
            children: renderItem(item, isFocused),
          },
          key,
        );
      };
      $[18] = direction;
      $[19] = focusedIndex;
      $[20] = getKey;
      $[21] = declareCursor;
      $[22] = onItemClick;
      $[23] = onItemHover;
      $[24] = renderItem;
      $[25] = strayClickGuard;
      $[26] = total;
      $[27] = visible.length;
      $[28] = visibleCount;
      $[29] = windowStart;
      $[30] = renderRow;
    } else renderRow = $[30];
    t1 = visible.map(renderRow);
    $[5] = direction;
    $[6] = focusedIndex;
    $[7] = getKey;
    $[8] = declareCursor;
    $[9] = onItemClick;
    $[10] = onItemHover;
    $[11] = renderItem;
    $[12] = strayClickGuard;
    $[13] = total;
    $[14] = visible;
    $[15] = visibleCount;
    $[16] = windowStart;
    $[17] = t1;
  } else t1 = $[17];
  let rows = t1;
  const flexDirection = direction === "up" ? "column-reverse" : "column";
  let onMouseLeave;
  if ($[31] !== onItemHover) {
    onMouseLeave = () => onItemHover(undefined);
    $[31] = onItemHover;
    $[32] = onMouseLeave;
  } else onMouseLeave = $[32];
  let listBoxElement;
  if ($[33] !== rows || $[34] !== flexDirection || $[35] !== onMouseLeave || $[36] !== visibleCount) {
    listBoxElement = jsxProd_default(Box, {
      height: visibleCount,
      flexShrink: 0,
      flexDirection,
      onMouseLeave,
      children: rows,
    });
    $[33] = rows;
    $[34] = flexDirection;
    $[35] = onMouseLeave;
    $[36] = visibleCount;
    $[37] = listBoxElement;
  } else listBoxElement = $[37];
  return listBoxElement;
}
//@ chunk-czq1j3j2.js:683610-683676 file-local
function firstWord(s) {
  let i = s.indexOf(" ");
  return i === -1 ? s : s.slice(0, i);
}
export { FuzzyPicker };
