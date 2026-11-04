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
  useRef,
  useState,
  useEffect,
  useEffectEvent,
  createContext,
  useContext,
  useSyncExternalStore,
  childrenExport,
  useLayoutEffect,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import { hitTest } from "../../ink/hit-test.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useSelectState_2 } from "./use-select-state.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import { count } from "../../utils/collections.js";
import { useSelectInput, usePasteIntoInputOption } from "./use-select-input.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { OverflowHint } from "../CtrlOToExpand.js";
import { SelectInputOption } from "./select-input-option.js";
import { SelectOption } from "./select-option.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { reactNodeText } from "../../utils/reactText.js";
import { truncateToWidth } from "../../utils/format.js";
import { StatusIcon, maxStatusIconWidth } from "../design-system/StatusIcon.js";
import {
  WindowedText,
  useHoverHighlight,
  userMessageBackgroundMode,
  USER_MESSAGE_BACKGROUND,
  Select,
} from "./selectTypeahead.js";
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
import { useClock } from "../../ink/components/ClockContext.js";
import { UP_ARROW, DOWN_ARROW, HEAVY_VERTICAL_BAR_GLYPH } from "../../constants/figures.js";
import { AlternateScreenContext } from "../../ink/components/AlternateScreen.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
import { TREE_GLYPHS } from "../../../vendor/chart.js/dist/chart.js";
import { NoSelect, useHasFocus, useFocus, useMeasured } from "../../ink/components/Input.js";
import { Decorative, useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { clamp } from "../../ink/screen.js";
import { useLatestState } from "./option-map.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { ContextSlotA, contextSlot } from "../../context/contextSlots.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { ListItem } from "../design-system/ListItem.js";
import { isOrderedListItem, metaTexts } from "./selectTable.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ey2qag4x.js:43084-43088 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:43084", () => {
  init_react_production();
});
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
  let ref = useRef(null);
  if (isDisabled || visibleToIndex - visibleFromIndex >= optionCount)
    return {
      ref,
      onWheel: undefined,
    };
  return {
    ref,
    onWheel: (event) => {
      if (event.deltaY === 0 || shouldDropWheel()) return;
      let node = ref.current;
      if (
        node !== null &&
        event.col !== undefined &&
        event.row !== undefined &&
        hitTest(node, event.col, event.row) === null
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
var NO_COMMITTED_ROW; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:43773", () => {
  NO_COMMITTED_ROW = Symbol("NO_COMMITTED_ROW");
});
//@ chunk-ey2qag4x.js:44614-57659 fingerprint = Select (0.772)
/**
 * 通用单选：按 layout 渲染选项（可带描述、两栏、数字前缀），useSelectState 管理焦点与视口，支持 input 类型选项（就地编辑）、onFocus/onChange/onCancel。
 */
function Select_2(props) {
  let $ = useMemoCache(89);
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
  let isDisabledFlag = isDisabled === undefined ? false : isDisabled;
  let hideIndexesFlag = hideIndexes === undefined ? false : hideIndexes;
  let disablePrintableKeys = disablePrintableKeybindings === undefined ? false : disablePrintableKeybindings;
  let visibleCountProp = visibleOptionCount === undefined ? 5 : visibleOptionCount;
  let sizingOptions = columnSizingOptions === undefined ? options : columnSizingOptions;
  let layoutMode = layout === undefined ? "compact" : layout;
  let selectionDisabled = disableSelection === undefined ? false : disableSelection;
  let inlineDescriptionsFlag = inlineDescriptions === undefined ? false : inlineDescriptions;
  let extraChromeWidth = inputChromeWidth === undefined ? 0 : inputChromeWidth;
  let pointerWhileDisabledFlag = pointerWhileDisabled === undefined ? false : pointerWhileDisabled;
  let [imagesSelected, setImagesSelected] = useState(false);
  let [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
  let [inputValues, setInputValues] = useState(t7);
  let t8;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t8 = new Map();
    $[2] = t8;
  } else t8 = $[2];
  let lastInitialValues = useRef(t8);
  let syncInitialValuesEffect;
  let syncInitialValuesDeps;
  if ($[3] !== inputValues || $[4] !== options) {
    syncInitialValuesEffect = () => {
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
    syncInitialValuesDeps = [options, inputValues];
    $[3] = inputValues;
    $[4] = options;
    $[5] = syncInitialValuesEffect;
    $[6] = syncInitialValuesDeps;
  } else {
    syncInitialValuesEffect = $[5];
    syncInitialValuesDeps = $[6];
  }
  useEffect(syncInitialValuesEffect, syncInitialValuesDeps);
  let useVerticalLayout =
    layoutMode === "compact" &&
    !inlineDescriptionsFlag &&
    !sizingOptions.some(isInputOption) &&
    sizingOptions.some(hasDescription);
  let { columns } = useScrollViewportSize(useTerminalSize());
  const visibleOptionCount_2 = fitVisibleOptionCount(
    visibleCountProp,
    useVerticalLayout ? "compact-vertical" : layoutMode,
  );
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
  let [isEntryFocused, setIsEntryFocused] = useState(true);
  let strayClickGuard = useStrayClickGuard();
  let shouldDropWheel = useIsWithinStrayWindow();
  let clickHandlerCached;
  if (
    $[16] !== selectionDisabled ||
    $[17] !== isDisabledFlag ||
    $[18] !== pointerWhileDisabledFlag ||
    $[19] !== strayClickGuard ||
    $[20] !== state
  ) {
    clickHandlerCached = (option) =>
      (isDisabledFlag && !pointerWhileDisabledFlag) || selectionDisabled === true || option.disabled === true
        ? undefined
        : (event) => {
            if (strayClickGuard(event)) {
              return;
            }
            if (option.type === "input") state.focusOption(option.value);
            else state.onChange?.(option.value);
          };
    $[16] = selectionDisabled;
    $[17] = isDisabledFlag;
    $[18] = pointerWhileDisabledFlag;
    $[19] = strayClickGuard;
    $[20] = state;
    $[21] = clickHandlerCached;
  } else clickHandlerCached = $[21];
  let makeClickHandler = clickHandlerCached;
  const disableSelection_2 = selectionDisabled || (hideIndexesFlag ? "numeric" : false);
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
    $[25] !== isEntryFocused ||
    $[26] !== imagesSelected ||
    $[27] !== inputValues ||
    $[28] !== isDisabledFlag ||
    $[29] !== onDownFromLastItem ||
    $[30] !== onInputModeToggle ||
    $[31] !== onUpFromFirstItem ||
    $[32] !== options ||
    $[33] !== state ||
    $[34] !== disableSelection_2 ||
    $[35] !== onEnterImageSelection
  ) {
    t14 = {
      isDisabled: isDisabledFlag,
      hasInkFocus: isEntryFocused,
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
    $[25] = isEntryFocused;
    $[26] = imagesSelected;
    $[27] = inputValues;
    $[28] = isDisabledFlag;
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
  let hiddenBelowElement;
  if (
    $[37] !== canPasteImage ||
    $[38] !== options ||
    $[39] !== state.focusOption ||
    $[40] !== state.focusedValue
  ) {
    hiddenBelowElement = {
      options,
      focusedValue: state.focusedValue,
      focusOption: state.focusOption,
      canPaste: canPasteImage,
    };
    $[37] = canPasteImage;
    $[38] = options;
    $[39] = state.focusOption;
    $[40] = state.focusedValue;
    $[41] = hiddenBelowElement;
  } else hiddenBelowElement = $[41];
  let onPaste = usePasteIntoInputOption(hiddenBelowElement);
  let wheelOptions = useRef(null);
  useFocusOnMount(wheelOptions, !isDisabledFlag);
  let styles = {
    container: () => ({
      flexDirection: "column",
      ref: wheelOptions,
      ...(isDisabledFlag
        ? {}
        : {
            tabIndex: 0,
            textEntry: disablePrintableKeys ? true : undefined,
            onKeyDown: handleKeyDown,
            onPaste,
            onFocus: () => setIsEntryFocused(true),
            onBlur: () => setIsEntryFocused(false),
          }),
    }),
    highlightedText: boldTextStyle,
  };
  let hiddenBelow;
  if (
    $[42] !== hiddenBelowUnit ||
    $[43] !== options.length ||
    $[44] !== state.visibleFromIndex ||
    $[45] !== state.visibleToIndex
  ) {
    hiddenBelow =
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
    $[46] = hiddenBelow;
  } else hiddenBelow = $[46];
  let hiddenBelow_2 = hiddenBelow;
  let wheelState;
  if (
    $[47] !== isDisabledFlag ||
    $[48] !== options.length ||
    $[49] !== shouldDropWheel ||
    $[50] !== state.scrollViewport ||
    $[51] !== state.visibleFromIndex ||
    $[52] !== state.visibleToIndex
  ) {
    wheelState = {
      isDisabled: isDisabledFlag,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel,
    };
    $[47] = isDisabledFlag;
    $[48] = options.length;
    $[49] = shouldDropWheel;
    $[50] = state.scrollViewport;
    $[51] = state.visibleFromIndex;
    $[52] = state.visibleToIndex;
    $[53] = wheelState;
  } else wheelState = $[53];
  let rows = useSelectWheel(wheelState);
  if (layoutMode === "expanded") {
    let t18;
    if ($[54] !== hideIndexesFlag || $[55] !== state.options) {
      t18 = hideIndexesFlag ? 0 : state.options.length.toString().length;
      $[54] = hideIndexesFlag;
      $[55] = state.options;
      $[56] = t18;
    } else t18 = $[56];
    let maxIndexWidth = t18;
    return jsxProd_default(WindowedRowsBox, {
      container: styles.container(),
      rows,
      hiddenBelow: hiddenBelow_2,
      children: state.visibleOptions.map((option, index) => {
        let isFirstVisibleOption = option.index === state.visibleFromIndex;
        let isLastVisibleOption = option.index === state.visibleToIndex - 1;
        let areMoreOptionsBelow = state.visibleToIndex < options.length;
        let areMoreOptionsAbove = state.visibleFromIndex > 0;
        let i = state.visibleFromIndex + index + 1;
        let isFocused = !isDisabledFlag && state.focusedValue === option.value;
        let isSelected = state.value === option.value;
        if (option.type === "input") {
          let inputValue = inputValues.has(option.value)
            ? inputValues.get(option.value)
            : option.initialValue || "";
          return jsxProd_default(
            SelectInputOption,
            {
              option,
              onClick: makeClickHandler(option),
              hoverStyle,
              isFocused,
              isSelected,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i,
              hideIndex: hideIndexesFlag,
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
              showLabel: inlineDescriptionsFlag,
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
                onClick: makeClickHandler(option),
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
  if (layoutMode === "compact-vertical") {
    let t18;
    if ($[57] !== hideIndexesFlag || $[58] !== state.options) {
      t18 = hideIndexesFlag ? 0 : state.options.length.toString().length;
      $[57] = hideIndexesFlag;
      $[58] = state.options;
      $[59] = t18;
    } else t18 = $[59];
    let maxIndexWidth = t18;
    return jsxProd_default(WindowedRowsBox, {
      container: styles.container(),
      rows,
      hiddenBelow: hiddenBelow_2,
      children: state.visibleOptions.map((option, index) => {
        let isFirstVisibleOption = option.index === state.visibleFromIndex;
        let isLastVisibleOption = option.index === state.visibleToIndex - 1;
        let areMoreOptionsBelow = state.visibleToIndex < options.length;
        let areMoreOptionsAbove = state.visibleFromIndex > 0;
        let i_0 = state.visibleFromIndex + index + 1;
        let isFocused = !isDisabledFlag && state.focusedValue === option.value;
        let isSelected = state.value === option.value;
        if (option.type === "input") {
          let inputValue = inputValues.has(option.value)
            ? inputValues.get(option.value)
            : option.initialValue || "";
          return jsxProd_default(
            SelectInputOption,
            {
              option,
              onClick: makeClickHandler(option),
              hoverStyle,
              isFocused,
              isSelected,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i_0,
              hideIndex: hideIndexesFlag,
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
              showLabel: inlineDescriptionsFlag,
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
                onClick: makeClickHandler(option),
                hoverStyle,
                children: jsxProd_default_2(Fragment, {
                  children: [
                    !hideIndexesFlag &&
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
                  paddingLeft: hideIndexesFlag ? 4 : maxIndexWidth + 4,
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
  let indexWidthCached;
  if ($[60] !== sizingOptions || $[61] !== hideIndexesFlag) {
    indexWidthCached = hideIndexesFlag ? 0 : sizingOptions.length.toString().length;
    $[60] = sizingOptions;
    $[61] = hideIndexesFlag;
    $[62] = indexWidthCached;
  } else indexWidthCached = $[62];
  let indexWidth = indexWidthCached;
  if (useVerticalLayout) {
    let indexColumnWidth;
    let maxRowWidth;
    if (
      $[63] !== columns ||
      $[64] !== sizingOptions ||
      $[65] !== hideIndexesFlag ||
      $[66] !== indexWidth ||
      $[67] !== state.value
    ) {
      indexColumnWidth = hideIndexesFlag ? 0 : indexWidth + 2;
      let labelColumnWidthCached;
      if ($[70] !== sizingOptions || $[71] !== indexColumnWidth || $[72] !== state.value) {
        let measureRowWidth;
        if ($[74] !== indexColumnWidth || $[75] !== state.value) {
          measureRowWidth = (option) => {
            if (option.type === "input") {
              return 0;
            }
            let selectionPad = state.value === option.value ? 2 : 0;
            return 2 + indexColumnWidth + bunStringWidth(reactNodeText(option.label)) + selectionPad;
          };
          $[74] = indexColumnWidth;
          $[75] = state.value;
          $[76] = measureRowWidth;
        } else measureRowWidth = $[76];
        labelColumnWidthCached = Math.max(...sizingOptions.map(measureRowWidth));
        $[70] = sizingOptions;
        $[71] = indexColumnWidth;
        $[72] = state.value;
        $[73] = labelColumnWidthCached;
      } else labelColumnWidthCached = $[73];
      maxRowWidth = Math.min(labelColumnWidthCached, Math.floor(columns * MAX_WIDTH_RATIO));
      $[63] = columns;
      $[64] = sizingOptions;
      $[65] = hideIndexesFlag;
      $[66] = indexWidth;
      $[67] = state.value;
      $[68] = indexColumnWidth;
      $[69] = maxRowWidth;
    } else {
      indexColumnWidth = $[68];
      maxRowWidth = $[69];
    }
    let optionData = state.visibleOptions.map((option, index) => {
      let isFirstVisibleOption = option.index === state.visibleFromIndex;
      let isLastVisibleOption = option.index === state.visibleToIndex - 1;
      let areMoreOptionsBelow = state.visibleToIndex < options.length;
      let areMoreOptionsAbove = state.visibleFromIndex > 0;
      let i_1 = state.visibleFromIndex + index + 1;
      let isFocused = !isDisabledFlag && state.focusedValue === option.value;
      let isSelected = state.value === option.value;
      let isOptionDisabled = option.disabled === true;
      let selectionPad_2 = isSelected ? 2 : 0;
      let labelText = reactNodeText(option.label);
      let label_1 = option.label;
      let labelBudget = maxRowWidth - 2 - indexColumnWidth - selectionPad_2;
      if (bunStringWidth(labelText) > labelBudget) {
        labelText = truncateToWidth(labelText, labelBudget);
        label_1 = labelText;
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
        labelWidth: 2 + indexColumnWidth + bunStringWidth(labelText) + selectionPad_2,
        isFocused,
        isSelected,
        isOptionDisabled,
        shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
        shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
      };
    });
    const container = styles.container();
    let renderRow;
    if (
      $[77] !== makeClickHandler ||
      $[78] !== hideIndexesFlag ||
      $[79] !== hoverStyle ||
      $[80] !== indexWidth ||
      $[81] !== maxRowWidth
    ) {
      renderRow = (data) => {
        if (data.option.type === "input") {
          return null;
        }
        let labelFill = maxRowWidth - data.labelWidth;
        return jsxProd_default_2(
          SelectOptionRow,
          {
            isFocused: data.isFocused,
            shouldShowDownArrow: data.shouldShowDownArrow,
            shouldShowUpArrow: data.shouldShowUpArrow,
            onClick: makeClickHandler(data.option),
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
                      !hideIndexesFlag &&
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: `${data.index}.`.padEnd(indexWidth + 2),
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
                  labelFill > 0 &&
                    jsxProd_default(Text, {
                      children: " ".repeat(labelFill),
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
      $[77] = makeClickHandler;
      $[78] = hideIndexesFlag;
      $[79] = hoverStyle;
      $[80] = indexWidth;
      $[81] = maxRowWidth;
      $[82] = renderRow;
    } else renderRow = $[82];
    return jsxProd_default(WindowedRowsBox, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children: optionData.map(renderRow),
    });
  }
  const RowsBoxComponent = WindowedRowsBox;
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
      let isFocused = !isDisabledFlag && state.focusedValue === option.value;
      let isSelected = state.value === option.value;
      return jsxProd_default(
        SelectInputOption,
        {
          option,
          onClick: makeClickHandler(option),
          hoverStyle,
          isFocused,
          isSelected,
          shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
          shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
          maxIndexWidth: indexWidth,
          index: i_2,
          hideIndex: hideIndexesFlag,
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
          showLabel: inlineDescriptionsFlag,
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
    let isFocused = !isDisabledFlag && state.focusedValue === option.value;
    let isSelected = state.value === option.value;
    let isOptionDisabled = option.disabled === true;
    return jsxProd_default_2(
      SelectOption,
      {
        isFocused,
        isSelected,
        shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
        shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
        onClick: makeClickHandler(option),
        hoverStyle,
        children: [
          jsxProd_default_2(Box, {
            flexDirection: "row",
            flexShrink: 0,
            children: [
              !hideIndexesFlag &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: `${i_3}.`.padEnd(indexWidth + 2),
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
                  inlineDescriptionsFlag &&
                    option.description &&
                    jsxProd_default_2(Text, {
                      dimColor: isOptionDisabled || option.dimDescription !== false,
                      children: [" ", option.description],
                    }),
                ],
              }),
            ],
          }),
          !inlineDescriptionsFlag &&
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
  let selectElement;
  if (
    $[83] !== RowsBoxComponent ||
    $[84] !== hiddenBelow_2 ||
    $[85] !== rows ||
    $[86] !== container ||
    $[87] !== children
  ) {
    selectElement = jsxProd_default(RowsBoxComponent, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children,
    });
    $[83] = RowsBoxComponent;
    $[84] = hiddenBelow_2;
    $[85] = rows;
    $[86] = container;
    $[87] = children;
    $[88] = selectElement;
  } else selectElement = $[88];
  return selectElement;
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
function fitVisibleOptionCount(optionCount, density) {
  let densityResolved = density === undefined ? "compact" : density;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let rowsPerOption = densityResolved === "expanded" ? 3 : densityResolved === "compact" ? 1 : 2;
  let max = Math.max(1, Math.floor((rows - MENU_VERTICAL_CHROME_ROWS) / rowsPerOption));
  return Math.min(optionCount, max);
}
//@ chunk-ey2qag4x.js:57834-58108 placement
function WindowedRowsBox(props) {
  let $ = useMemoCache(7);
  let { container, rows, hiddenBelow, children } = props;
  let windowedText;
  if ($[0] !== children || $[1] !== rows) {
    windowedText = jsxProd_default(WindowedText, {
      ...rows,
      children,
    });
    $[0] = children;
    $[1] = rows;
    $[2] = windowedText;
  } else windowedText = $[2];
  let box;
  if ($[3] !== container || $[4] !== hiddenBelow || $[5] !== windowedText) {
    box = jsxProd_default_2(Box, {
      ...container,
      children: [windowedText, hiddenBelow],
    });
    $[3] = container;
    $[4] = hiddenBelow;
    $[5] = windowedText;
    $[6] = box;
  } else box = $[6];
  return box;
}
//@ chunk-ey2qag4x.js:58108-59296 placement
/**
 * 选择列表的一行（焦点、上下箭头、点击与悬停样式）。
 */
function SelectOptionRow(props) {
  let $ = useMemoCache(24);
  let { isFocused, shouldShowDownArrow, shouldShowUpArrow, onClick, hoverStyle, children } = props;
  let isClickable = onClick !== undefined;
  let [isHovered, setIsHovered] = useHoverHighlight(isClickable);
  let backgroundMode = userMessageBackgroundMode(hoverStyle);
  let inverse = isClickable && isHovered && backgroundMode === "inverse";
  let cursorOptions;
  if ($[0] !== isFocused) {
    cursorOptions = {
      line: 0,
      column: 0,
      active: isFocused,
    };
    $[0] = isFocused;
    $[1] = cursorOptions;
  } else cursorOptions = $[1];
  let ref = useDeclaredCursor(cursorOptions);
  const backgroundColor =
    isClickable && isHovered && backgroundMode === "tint" ? USER_MESSAGE_BACKGROUND : undefined;
  let onMouseEnter;
  if ($[2] !== isClickable || $[3] !== setIsHovered) {
    onMouseEnter = isClickable ? () => setIsHovered(true) : undefined;
    $[2] = isClickable;
    $[3] = setIsHovered;
    $[4] = onMouseEnter;
  } else onMouseEnter = $[4];
  let onMouseLeave;
  if ($[5] !== isClickable || $[6] !== setIsHovered) {
    onMouseLeave = isClickable ? () => setIsHovered(false) : undefined;
    $[5] = isClickable;
    $[6] = setIsHovered;
    $[7] = onMouseLeave;
  } else onMouseLeave = $[7];
  let indicatorElement;
  if (
    $[8] !== isClickable ||
    $[9] !== backgroundMode ||
    $[10] !== isHovered ||
    $[11] !== inverse ||
    $[12] !== isFocused ||
    $[13] !== shouldShowDownArrow ||
    $[14] !== shouldShowUpArrow
  ) {
    indicatorElement = jsxProd_default(Box, {
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
            : isClickable && isHovered && backgroundMode === "pointer"
              ? jsxProd_default(Text, {
                  dimColor: true,
                  children: figures_default.pointer,
                })
              : jsxProd_default(Text, {
                  inverse,
                  children: " ",
                }),
    });
    $[8] = isClickable;
    $[9] = backgroundMode;
    $[10] = isHovered;
    $[11] = inverse;
    $[12] = isFocused;
    $[13] = shouldShowDownArrow;
    $[14] = shouldShowUpArrow;
    $[15] = indicatorElement;
  } else indicatorElement = $[15];
  let rowElement;
  if (
    $[16] !== children ||
    $[17] !== ref ||
    $[18] !== onClick ||
    $[19] !== backgroundColor ||
    $[20] !== onMouseEnter ||
    $[21] !== onMouseLeave ||
    $[22] !== indicatorElement
  ) {
    rowElement = jsxProd_default_2(Box, {
      ref,
      flexDirection: "row",
      flexShrink: 0,
      backgroundColor,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children: [indicatorElement, children],
    });
    $[16] = children;
    $[17] = ref;
    $[18] = onClick;
    $[19] = backgroundColor;
    $[20] = onMouseEnter;
    $[21] = onMouseLeave;
    $[22] = indicatorElement;
    $[23] = rowElement;
  } else rowElement = $[23];
  return rowElement;
}
//@ chunk-8jypjjdf.js:1309-1313 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8jypjjdf.js:1309", () => {
  init_react_production();
});
//@ chunk-8jypjjdf.js:1313-1642 fingerprint = TwoColumnRow (0.736)
function TwoColumnRow(t0) {
  let $ = useMemoCache(10);
  let active;
  let rest;
  let children;
  if ($[0] !== t0) {
    ({ active, children, ...rest } = t0);
    $[0] = t0;
    $[1] = active;
    $[2] = rest;
    $[3] = children;
  } else {
    active = $[1];
    rest = $[2];
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
  if ($[6] !== rest || $[7] !== children || $[8] !== cursorRef) {
    t2 = jsxProd_default(Box, {
      ...rest,
      ref: cursorRef,
      children,
    });
    $[6] = rest;
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
  let $ = useMemoCache(5);
  let { storageV5 } = useTheme_2();
  let store;
  if ($[0] !== storageV5) {
    store = () => markAutoDefaultNoticeSeen(storageV5);
    $[0] = storageV5;
    $[1] = store;
  } else store = $[1];
  useNoticeImpression(AUTO_MODE_DEFAULT, store);
  let titleText;
  let _;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: AUTO_DEFAULT_NOTICE_TITLE,
    });
    _ = jsxProd_default(Text, {
      dimColor: true,
      children: AUTO_DEFAULT_NOTICE_BODY,
    });
    $[2] = titleText;
    $[3] = _;
  } else {
    titleText = $[2];
    _ = $[3];
  }
  let noticeBox;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    noticeBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        titleText,
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
    $[4] = noticeBox;
  } else noticeBox = $[4];
  return noticeBox;
}
//@ chunk-r68xwcze.js:1089-1093 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:1089", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:1093-1097 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:1093", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:1097-1101 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:1097", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:1101-1105 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:1101", () => {
  init_react_production();
});
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
  let backgroundMode = userMessageBackgroundMode();
  let [isHovered, setIsHovered] = useState(false);
  let [isPressed, setIsPressed] = useState(false);
  let pressRef = useRef(null);
  let [repeatRefState, setRepeatRefState] = useState(null);
  let clickTimerRef = useRef(null);
  useEffect(() => () => clickTimerRef.current?.(), []);
  let isPressable = onPress !== undefined;
  if (!isPressable && (isHovered || isPressed || repeatRefState !== null)) {
    setIsHovered(false);
    setIsPressed(false);
    setRepeatRefState(null);
  }
  useEffect(() => {
    if (!isPressable) pressRef.current = null;
  }, [isPressable]);
  let fireRepeat = useEffectEvent((pressState) => {
    let currentPress = pressRef.current;
    if (currentPress !== pressState) return;
    currentPress.hasActed = true;
    onPress?.({
      row: currentPress.row,
    });
  });
  useEffect(() => {
    if (repeatRefState === null) return;
    let timer = clock.setTimeout(function repeatTick() {
      fireRepeat(repeatRefState);
      timer = clock.setTimeout(repeatTick, CLICK_TIME_SLOP_MS);
    }, MULTI_CLICK_MAX_MS_2);
    return () => timer();
  }, [repeatRefState, clock]);
  function handleClick(event) {
    event.stopImmediatePropagation();
    if (clickTimerRef.current !== null || strayClickGuard(event)) return;
    event.endClickChain();
    setIsPressed(true);
    clickTimerRef.current = clock.setTimeout(() => {
      clickTimerRef.current = null;
      setIsPressed(false);
      onPress?.(event);
    }, MULTI_CLICK_MIN_MS);
  }
  function handleMouseEvent(event) {
    if (event.type === "down" && event.button === 0) {
      let press = {
        col: event.col,
        row: event.row,
        hasActed: false,
      };
      pressRef.current = press;
      setIsPressed(true);
      setRepeatRefState(press);
    } else if (event.type === "up") {
      let press = pressRef.current;
      pressRef.current = null;
      setIsPressed(false);
      setRepeatRefState(null);
      if (press !== null && !press.hasActed && !event.isUnreported && isNearPoint(press, event))
        onPress?.({
          row: press.row,
        });
    }
  }
  let isInverse = backgroundMode === "inverse";
  let backgroundColor = isInverse
    ? undefined
    : isPressed
      ? "text"
      : isHovered
        ? USER_MESSAGE_BACKGROUND
        : undefined;
  let [firstChild = "", ...restChildren] = children;
  return jsxProd_default_2(Box, {
    paddingLeft: paddingX,
    flexShrink: 1,
    alignSelf: "flex-start",
    backgroundColor,
    onClick: isPressable && !repeat ? handleClick : undefined,
    onPointer: isPressable && repeat ? handleMouseEvent : undefined,
    onMouseEnter: isPressable ? () => setIsHovered(true) : undefined,
    onMouseLeave: isPressable ? () => setIsHovered(false) : undefined,
    hoverFollowsPaint: isPressable,
    noSelect: true,
    children: [
      jsxProd_default(Text, {
        color: isPressed && !isInverse ? "inverseText" : undefined,
        dimColor: !isPressed,
        inverse: isPressed && isInverse,
        wrap: "truncate-end",
        children:
          isHovered && !isPressed && isInverse
            ? jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(Text, {
                    inverse: true,
                    children: firstChild,
                  }),
                  restChildren.join(""),
                ],
              })
            : children,
      }),
      paddingX > 0 &&
        isPressable &&
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
  let $ = useMemoCache(2);
  let clock = useClock();
  let factory;
  if ($[0] !== clock) {
    factory = () => {
      let last = {
        at: Number.NEGATIVE_INFINITY,
        row: -1,
      };
      return {
        pressed: (event) => {
          last = {
            at: clock.now(),
            row: event.row,
          };
        },
        dropsClick: (event) => {
          if (event.row !== last.row || clock.now() - last.at >= HIGHLIGHT_REFRESH_MS) {
            return false;
          }
          event.dropAsStray();
          return true;
        },
      };
    };
    $[0] = clock;
    $[1] = factory;
  } else factory = $[1];
  let [filter] = useState(factory);
  return filter;
}
//@ chunk-r68xwcze.js:2877-2896 placement
/**
 * 恒为 false 的焦点 context（没有真实焦点时的默认值）。
 */
var NO_FOCUS_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:2877", () => {
  NO_FOCUS_CONTEXT = createContext(() => false);
});
//@ chunk-r68xwcze.js:2896-3162 placement
function MoreItemsIndicator(props) {
  let $ = useMemoCache(3);
  let { direction, count, onPress } = props;
  if (count <= 0) {
    return null;
  }
  const children = `${direction === "above" ? UP_ARROW : DOWN_ARROW} ${count} more`;
  let indicator;
  if ($[0] !== onPress || $[1] !== children) {
    indicator = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default(ScrollArrowButton, {
        paddingX: 1,
        onPress,
        children,
      }),
    });
    $[0] = onPress;
    $[1] = children;
    $[2] = indicator;
  } else indicator = $[2];
  return indicator;
}
//@ chunk-r68xwcze.js:3162-3166 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:3162", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:3166-3170 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:3166", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:3170-3270 placement
function useHoverTrackingEnabled() {
  let alternateScreen = useContext(AlternateScreenContext);
  let { subscribeHoverTracked, isHoverTracked } = useContext(APP_CONTEXT);
  let hoverTracked = useSyncExternalStore(subscribeHoverTracked, isHoverTracked);
  return alternateScreen ?? hoverTracked;
}
//@ chunk-r68xwcze.js:3270-3274 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:3270", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:3274-3283 placement
var MIN_SCROLLBAR_ROWS = 5;
//@ chunk-r68xwcze.js:3283-6052 placement
/**
 * 列表滚动条（偏移、可见数、点击/拖动滚动）。
 */
function ScrollBar(props) {
  let $ = useMemoCache(50);
  let { offset, visible, total, height, onScrollTo, onScrollBy, arrows } = props;
  let barHeight = height === undefined ? visible : height;
  let showArrows = arrows === undefined ? false : arrows;
  let dragRef = useRef(null);
  let [isDragging, setIsDragging] = useState(false);
  let [isHovered, setIsHovered] = useState(false);
  let isScrollable = onScrollTo !== undefined;
  let clearDragEffect;
  let clearDragDeps;
  if ($[0] !== isScrollable) {
    clearDragEffect = () => {
      if (!isScrollable && dragRef.current !== null && dragRef.current.jump !== null) dragRef.current = null;
    };
    clearDragDeps = [isScrollable];
    $[0] = isScrollable;
    $[1] = clearDragEffect;
    $[2] = clearDragDeps;
  } else {
    clearDragEffect = $[1];
    clearDragDeps = $[2];
  }
  useEffect(clearDragEffect, clearDragDeps);
  if (total <= visible || barHeight < 1) {
    return null;
  }
  let hasArrows = showArrows && barHeight >= MIN_SCROLLBAR_ROWS;
  let trackHeight = hasArrows ? barHeight - 2 : barHeight;
  let thumbCached;
  if ($[3] !== trackHeight || $[4] !== offset || $[5] !== total || $[6] !== visible) {
    thumbCached = computeScrollThumb({
      offset,
      visible,
      total,
      height: trackHeight,
    });
    $[3] = trackHeight;
    $[4] = offset;
    $[5] = total;
    $[6] = visible;
    $[7] = thumbCached;
  } else thumbCached = $[7];
  let { top, size } = thumbCached;
  let belowSize = trackHeight - top - size;
  let pointerHandlerCached;
  if (
    $[8] !== trackHeight ||
    $[9] !== offset ||
    $[10] !== onScrollTo ||
    $[11] !== size ||
    $[12] !== top ||
    $[13] !== total ||
    $[14] !== visible
  ) {
    pointerHandlerCached = function handlePointer(event) {
      let drag = dragRef.current;
      if (event.type === "up") {
        dragRef.current = null;
        setIsDragging(false);
        if (drag !== null && drag.jump !== null && !event.isUnreported && isNearPoint(drag.jump, event))
          scrollToRow(
            {
              ...drag,
              asked: offset,
            },
            event.row,
            false,
          );
        return;
      }
      if (event.type === "down" && event.button === 0) {
        let onThumb = event.localRow >= top && event.localRow < top + size;
        let nextDrag = {
          trackRow: event.row - event.localRow,
          visible,
          total,
          height: trackHeight,
          grab: onThumb ? event.localRow - top : Math.floor(size / 2),
          asked: offset,
          jump: onThumb
            ? null
            : {
                col: event.col,
                row: event.row,
              },
        };
        dragRef.current = nextDrag;
        setIsDragging(true);
        if (onThumb) scrollToRow(nextDrag, event.row, true);
        return;
      }
      if (drag === null) {
        return;
      }
      if (drag.jump !== null) {
        if (Math.abs(event.row - drag.jump.row) <= CLICK_CELL_SLOP) {
          return;
        }
        drag.jump = null;
      }
      scrollToRow(drag, event.row, false);
    };
    function scrollToRow(drag, row, isDragStart) {
      let nextOffset = scrollOffsetFromThumbTop({
        top: row - drag.trackRow - drag.grab,
        visible: drag.visible,
        total: drag.total,
        height: drag.height,
      });
      let clampedOffset =
        nextOffset >= drag.total - drag.visible ? drag.total - Math.min(drag.visible, visible) : nextOffset;
      if (clampedOffset === drag.asked) {
        return;
      }
      drag.asked = clampedOffset;
      if (!isDragStart) onScrollTo?.(clampedOffset);
    }
    $[8] = trackHeight;
    $[9] = offset;
    $[10] = onScrollTo;
    $[11] = size;
    $[12] = top;
    $[13] = total;
    $[14] = visible;
    $[15] = pointerHandlerCached;
  } else pointerHandlerCached = $[15];
  let color = isHovered || isDragging ? "suggestion" : undefined;
  let upArrowElement;
  if ($[16] !== hasArrows || $[17] !== offset || $[18] !== onScrollBy) {
    upArrowElement =
      hasArrows &&
      jsxProd_default(ScrollArrowButton, {
        repeat: true,
        onPress: onScrollBy && offset > 0 ? () => onScrollBy(-1) : undefined,
        children: UP_ARROW,
      });
    $[16] = hasArrows;
    $[17] = offset;
    $[18] = onScrollBy;
    $[19] = upArrowElement;
  } else upArrowElement = $[19];
  const onPointer = onScrollTo || isDragging ? pointerHandlerCached : undefined;
  let onMouseEnter;
  if ($[20] !== onScrollTo) {
    onMouseEnter = onScrollTo && (() => setIsHovered(true));
    $[20] = onScrollTo;
    $[21] = onMouseEnter;
  } else onMouseEnter = $[21];
  let onMouseLeave;
  if ($[22] !== onScrollTo) {
    onMouseLeave = onScrollTo && (() => setIsHovered(false));
    $[22] = onScrollTo;
    $[23] = onMouseLeave;
  } else onMouseLeave = $[23];
  let aboveElement;
  if ($[24] !== top) {
    aboveElement =
      top > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: repeatCharLines(TREE_GLYPHS.pipe, top),
      });
    $[24] = top;
    $[25] = aboveElement;
  } else aboveElement = $[25];
  let children;
  if ($[26] !== size) {
    children = repeatCharLines(HEAVY_VERTICAL_BAR_GLYPH, size);
    $[26] = size;
    $[27] = children;
  } else children = $[27];
  let thumbElementCached;
  if ($[28] !== children || $[29] !== color) {
    thumbElementCached = jsxProd_default(Text, {
      color,
      children,
    });
    $[28] = children;
    $[29] = color;
    $[30] = thumbElementCached;
  } else thumbElementCached = $[30];
  let belowElement;
  if ($[31] !== belowSize) {
    belowElement =
      belowSize > 0 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: repeatCharLines(TREE_GLYPHS.pipe, belowSize),
      });
    $[31] = belowSize;
    $[32] = belowElement;
  } else belowElement = $[32];
  let trackElement;
  if (
    $[33] !== aboveElement ||
    $[34] !== thumbElementCached ||
    $[35] !== belowElement ||
    $[36] !== onPointer ||
    $[37] !== onMouseEnter ||
    $[38] !== onMouseLeave
  ) {
    trackElement = jsxProd_default_2(NoSelect, {
      flexDirection: "column",
      flexShrink: 0,
      onPointer,
      onMouseEnter,
      onMouseLeave,
      children: [aboveElement, thumbElementCached, belowElement],
    });
    $[33] = aboveElement;
    $[34] = thumbElementCached;
    $[35] = belowElement;
    $[36] = onPointer;
    $[37] = onMouseEnter;
    $[38] = onMouseLeave;
    $[39] = trackElement;
  } else trackElement = $[39];
  let downArrowElement;
  if (
    $[40] !== hasArrows ||
    $[41] !== offset ||
    $[42] !== onScrollBy ||
    $[43] !== total ||
    $[44] !== visible
  ) {
    downArrowElement =
      hasArrows &&
      jsxProd_default(ScrollArrowButton, {
        repeat: true,
        onPress: onScrollBy && offset < total - visible ? () => onScrollBy(1) : undefined,
        children: DOWN_ARROW,
      });
    $[40] = hasArrows;
    $[41] = offset;
    $[42] = onScrollBy;
    $[43] = total;
    $[44] = visible;
    $[45] = downArrowElement;
  } else downArrowElement = $[45];
  let scrollBarElement;
  if ($[46] !== trackElement || $[47] !== downArrowElement || $[48] !== upArrowElement) {
    scrollBarElement = jsxProd_default(Decorative, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [upArrowElement, trackElement, downArrowElement],
      }),
    });
    $[46] = trackElement;
    $[47] = downArrowElement;
    $[48] = upArrowElement;
    $[49] = scrollBarElement;
  } else scrollBarElement = $[49];
  return scrollBarElement;
}
//@ chunk-r68xwcze.js:6052-6302 placement
function computeScrollThumb({ offset, visible, total, height }) {
  let thumbSize = clamp(Math.round((visible / total) * height), 1, Math.max(1, height - 1));
  let slack = height - thumbSize;
  let maxOffset = total - visible;
  if (offset <= 0)
    return {
      top: 0,
      size: thumbSize,
    };
  if (offset >= maxOffset)
    return {
      top: slack,
      size: thumbSize,
    };
  let rounded = Math.round((offset / maxOffset) * slack);
  if (slack < 2)
    return {
      top: rounded,
      size: thumbSize,
    };
  return {
    top: clamp(rounded, 1, slack - 1),
    size: thumbSize,
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
  let slack = height - size;
  let maxOffset = total - visible;
  if (top <= 0) return 0;
  if (top >= slack) return maxOffset;
  let rounded = Math.round((top / slack) * maxOffset);
  if (maxOffset < 2) return rounded;
  return clamp(rounded, 1, maxOffset - 1);
}
//@ chunk-r68xwcze.js:6509-6572 placement
function repeatCharLines(pipe, count) {
  return Array.from(
    {
      length: count,
    },
    () => pipe,
  ).join(`
`);
}
//@ chunk-r68xwcze.js:6572-7150 placement
function SelectRow(props) {
  let $ = useMemoCache(12);
  let { bar, height, children } = props;
  let [hovered, setHovered] = useState(false);
  let hoverTrackingEnabled = useHoverTrackingEnabled();
  if (hovered && !hoverTrackingEnabled) setHovered(false);
  let showBar = hoverTrackingEnabled && bar.total > bar.visible;
  let onMouseEnter;
  let onMouseLeave;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHovered(true);
    onMouseLeave = () => setHovered(false);
    $[0] = onMouseEnter;
    $[1] = onMouseLeave;
  } else {
    onMouseEnter = $[0];
    onMouseLeave = $[1];
  }
  let contentColumn;
  if ($[2] !== children) {
    contentColumn = jsxProd_default(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children,
    });
    $[2] = children;
    $[3] = contentColumn;
  } else contentColumn = $[3];
  let barNode;
  if ($[4] !== bar || $[5] !== showBar || $[6] !== height || $[7] !== hovered) {
    barNode =
      showBar &&
      (hovered
        ? jsxProd_default(ScrollBar, {
            ...bar,
            height,
          })
        : jsxProd_default(Box, {
            width: 1,
            flexShrink: 0,
          }));
    $[4] = bar;
    $[5] = showBar;
    $[6] = height;
    $[7] = hovered;
    $[8] = barNode;
  } else barNode = $[8];
  let row;
  if ($[9] !== contentColumn || $[10] !== barNode) {
    row = jsxProd_default_2(Box, {
      gap: 1,
      onMouseEnter,
      onMouseLeave,
      children: [contentColumn, barNode],
    });
    $[9] = contentColumn;
    $[10] = barNode;
    $[11] = row;
  } else row = $[11];
  return row;
}
//@ chunk-r68xwcze.js:7150-7154 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:7150", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:7154-7158 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:7154", () => {
  init_react_production();
});
//@ chunk-r68xwcze.js:7158-7320 placement
/**
 * 按聚焦下标、总数、窗口高度（及可选锚点）算可见窗口 [windowStart, windowEnd) 以及上下各隐藏多少项。
 */
function computeScrollWindow(anchor, count, visible, preferredStart = null) {
  let start = clamp(
    preferredStart === null ? anchor - visible + 1 : clamp(preferredStart, anchor - visible + 1, anchor),
    0,
    Math.max(0, count - visible),
  );
  let min = Math.min(start + visible, count);
  return {
    windowStart: start,
    windowEnd: min,
    moreAbove: start,
    moreBelow: count - min,
  };
}
//@ chunk-r68xwcze.js:7320-7335 placement
var EMPTY_HEADINGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r68xwcze.js:7320", () => {
  EMPTY_HEADINGS = new Set();
});
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
  let clampedCursor = clamp(cursorLine, 0, max);
  let getClampedCursor = () => clamp(getCursorLine(), 0, max);
  let [windowStartState, setWindowStart, preferredStart] = useLatestState(null);
  let windowCapacity = visibleCount + 2 * markerLines;
  let firstContentLine = 0;
  while (firstContentLine < lineCount && headings.has(firstContentLine)) firstContentLine++;
  let lastContentLine = lineCount - 1;
  while (lastContentLine >= 0 && headings.has(lastContentLine)) lastContentLine--;
  function markerInset(start, end) {
    return (start > firstContentLine ? markerLines : 0) + (end <= lastContentLine ? markerLines : 0);
  }
  function isBoundaryLine(line) {
    return (
      line <= 0 || line >= lineCount || boundaries === undefined || boundaries.has(line) || headings.has(line)
    );
  }
  function nextVisibleLine(from) {
    let min = Math.min(from + 1, lineCount);
    while (!isBoundaryLine(min)) min++;
    return min;
  }
  function isAnchorLine(line) {
    return isBoundaryLine(line) && !(line > firstContentLine && line <= firstContentLine + markerLines);
  }
  function stepLine(line, direction) {
    let next = line + direction;
    while (next > 0 && next < lineCount && !isAnchorLine(next)) next += direction;
    return clamp(next, 0, lineCount);
  }
  function windowEndFor(start) {
    for (let min = Math.min(start + windowCapacity, lineCount); min > start; min--)
      if (isBoundaryLine(min) && min - start + markerInset(start, min) <= windowCapacity) return min;
    return nextVisibleLine(start);
  }
  let lastStart = 0;
  for (let idx = lineCount - 1; idx >= 0; idx--)
    if (isAnchorLine(idx) && windowEndFor(idx) < lineCount) {
      lastStart = stepLine(idx, 1);
      break;
    }
  function isEndingOnHeading(start) {
    let end = windowEndFor(start);
    return headings.has(end - 1) && end < lineCount;
  }
  function hasContentInWindow(start) {
    let end = windowEndFor(start);
    for (let line = start; line < end; line++) if (!headings.has(line)) return true;
    return false;
  }
  function computeWindowStart(cursor, preferred) {
    let anchor = cursor;
    while (!isBoundaryLine(anchor)) anchor--;
    let end = nextVisibleLine(anchor);
    let endLimit = end > lastContentLine ? lineCount : end;
    let min = Math.min(anchor, lastStart);
    while (!isAnchorLine(min)) min--;
    let lowestStart = anchor <= firstContentLine ? 0 : min;
    while (lowestStart < min && windowEndFor(lowestStart) < end) lowestStart = stepLine(lowestStart, 1);
    let min_2 = Math.min(min, Math.max(0, endLimit - windowCapacity));
    while (min_2 < min && (!isAnchorLine(min_2) || windowEndFor(min_2) < endLimit)) min_2++;
    let start = clamp(preferred ?? min_2, Math.min(min_2, lowestStart), lowestStart);
    while (!isAnchorLine(start)) start--;
    if (preferred !== null && preferred > anchor)
      for (
        let candidate = stepLine(start, -1);
        candidate < start &&
        windowEndFor(candidate) >= endLimit &&
        (headings.has(start - 1) || isEndingOnHeading(start));
        candidate = stepLine(candidate, -1)
      )
        start = candidate;
    return start;
  }
  let windowStart = computeWindowStart(clampedCursor, windowStartState);
  let windowEnd = windowEndFor(windowStart);
  useEffect(() => {
    if (windowStartState !== null && windowStartState !== windowStart) setWindowStart(windowStart);
  }, [windowStartState, windowStart, setWindowStart]);
  function scrollToLine(target) {
    let currentStart = computeWindowStart(getClampedCursor(), preferredStart());
    let line = clamp(target, 0, lastStart);
    while (!isAnchorLine(line)) line--;
    let step = line < currentStart ? -1 : 1;
    while (
      line !== currentStart &&
      line > 0 &&
      line < lastStart &&
      ((headings.has(line - 1) && (step < 0 || !headings.has(line))) ||
        isEndingOnHeading(line) ||
        !hasContentInWindow(line))
    )
      line = stepLine(line, step);
    let newStart = hasContentInWindow(line) ? line : currentStart;
    setWindowStart(newStart);
    let start = newStart;
    let end = windowEndFor(newStart);
    while (start < end && computeWindowStart(start, newStart) !== newStart) start++;
    while (end > start && computeWindowStart(end - 1, newStart) !== newStart) end--;
    onScroll?.(start, end);
  }
  function scrollBy(delta) {
    let line = computeWindowStart(getClampedCursor(), preferredStart());
    for (let idx = 0; idx < Math.abs(delta); idx++) line = stepLine(line, delta < 0 ? -1 : 1);
    if (delta !== 0) scrollToLine(line);
  }
  let fits = windowEnd - windowStart >= lineCount;
  let spareLines = fits
    ? 0
    : Math.max(0, windowCapacity - markerInset(windowStart, windowEnd) - windowEnd + windowStart);
  let visibleCountFinal = windowEnd - windowStart + spareLines;
  return {
    windowStart,
    windowEnd,
    spareLines,
    fits,
    getWindow: () => {
      let start = computeWindowStart(getClampedCursor(), preferredStart());
      return {
        windowStart: start,
        windowEnd: windowEndFor(start),
      };
    },
    scrollBy,
    scrollTo: scrollToLine,
    pin: () => setWindowStart(computeWindowStart(getClampedCursor(), preferredStart())),
    bar: {
      offset: windowStart,
      visible: visibleCountFinal,
      total: lineCount,
      onScrollTo: fits
        ? undefined
        : (requestedOffset) =>
            scrollToLine(requestedOffset + visibleCountFinal >= lineCount ? lastStart : requestedOffset),
      onScrollBy: fits ? undefined : scrollBy,
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
  let containerRef = useRef(null);
  let max = Math.max(0, count - 1);
  let [cursorState, setCursorState, getCursorState] = useLatestState(() => {
    let startIndex = clamp(initialCursor, 0, max);
    return {
      index: startIndex,
      key: rowKeys?.[startIndex],
      resetKey,
    };
  });
  let hasFocus = useHasFocus(containerRef);
  let { focusDirection } = useFocus();
  let isDisabledNow = isDisabledValue(isDisabled);
  function resolveState(state) {
    if (!Object.is(state.resetKey, resetKey)) return 0;
    let clampedIndex = clamp(state.index, 0, max);
    if (state.key === undefined || rowKeys?.[clampedIndex] === state.key) return clampedIndex;
    let keyIndex = rowKeys?.indexOf(state.key) ?? -1;
    return keyIndex < 0 ? clampedIndex : keyIndex;
  }
  let cursor = resolveState(cursorState);
  function getCursor() {
    return resolveState(getCursorState());
  }
  function setCursorIndex(index) {
    setCursorState((previous) =>
      previous.index === index && previous.key === rowKeys?.[index] && Object.is(previous.resetKey, resetKey)
        ? previous
        : {
            index,
            key: rowKeys?.[index],
            resetKey,
          },
    );
  }
  let headingSet = new Set(headingLines);
  let size = headingSet.size;
  for (let idx = 0; idx < count; idx++) size += rowHeights?.[idx] ?? 1;
  let rowStartLines = [];
  let lineToRow = [0];
  let anchorLines = new Set();
  for (let idx = 0, nextRowStart = 0; idx < size; idx++) {
    if (idx >= nextRowStart) {
      anchorLines.add(idx);
      if (!headingSet.has(idx)) {
        nextRowStart = idx + (rowHeights?.[rowStartLines.length] ?? 1);
        rowStartLines.push(idx);
      }
    }
    lineToRow.push(rowStartLines.length);
  }
  let markerLines = moreRowLines ? 1 : 0;
  function moveCursorBy(delta) {
    setCursor((current) => {
      let next = current + delta;
      if (edge === "wrap" && count > 0) return ((next % count) + count) % count;
      return clamp(next, 0, max);
    });
  }
  function pageCursor(direction) {
    if (lineScroll.fits) return false;
    if (visibleCount === 1) {
      moveCursorBy(direction);
      return;
    }
    setCursor((current) => {
      let scrollWindow = lineScroll.getWindow();
      let targetLine = clamp(
        (rowStartLines[current] ?? 0) + direction * (scrollWindow.windowEnd - scrollWindow.windowStart),
        0,
        size - 1,
      );
      while (!anchorLines.has(targetLine)) targetLine--;
      return clamp(
        direction > 0
          ? Math.max((lineToRow[targetLine + 1] ?? 0) - 1, current + 1)
          : Math.min(lineToRow[targetLine] ?? 0, current - 1),
        0,
        max,
      );
    });
  }
  function stepCursor(direction) {
    if (getCursor() === (direction < 0 ? 0 : max)) {
      let edgeHandler = direction < 0 ? onUpFromFirstItem : onDownFromLastItem;
      if (edgeHandler) {
        edgeHandler();
        return;
      }
      if (edge !== "wrap" && focusDirection(direction < 0 ? "up" : "down")) return;
    }
    moveCursorBy(direction);
  }
  function jumpCursor(target) {
    if (declineHomeEnd && lineScroll.fits) return false;
    setCursor(target);
  }
  useEffect(() => {
    if (getCursorState() === cursorState) setCursorIndex(cursor);
  });
  let emitCursorChange = useEffectEvent((index) => onCursorChange?.(index));
  let lastReportedRef = useRef(null);
  useEffect(() => {
    if (count === 0) {
      lastReportedRef.current = null;
      return;
    }
    if (lastReportedRef.current !== cursor) {
      lastReportedRef.current = cursor;
      emitCursorChange(cursor);
    }
  }, [cursor, count]);
  function setCursor(next) {
    let nextIndex = clamp(typeof next === "function" ? next(getCursor()) : next, 0, max);
    setCursorIndex(nextIndex);
    if (count === 0 || nextIndex === lastReportedRef.current) return;
    lastReportedRef.current = nextIndex;
    onCursorChange?.(nextIndex);
  }
  MessageActionsKeybindings(
    import_mapValues(
      {
        "select:next": () => stepCursor(1),
        "select:previous": () => stepCursor(-1),
        "select:pageDown": () => pageCursor(1),
        "select:pageUp": () => pageCursor(-1),
        "select:first": () => jumpCursor(0),
        "select:last": () => jumpCursor(max),
      },
      (handler) => () => (isDisabledValue(isDisabled) ? false : handler()),
    ),
    {
      context: keybindingContext,
      isActive: hasFocus && !isDisabledNow && count > 0,
    },
  );
  MessageActionsKeybindings(
    {
      "select:accept": () => (isDisabledValue(isDisabled) ? false : onAccept?.(getCursor())),
    },
    {
      context: keybindingContext,
      isActive: hasFocus && !isDisabledNow && count > 0 && onAccept !== undefined,
    },
  );
  let hasBindingContext = useKeybindingContext() !== null;
  function handleKeyDown(event) {
    if (isDisabledValue(isDisabled) || count === 0) return;
    let currentIndex = getCursor();
    if (event.key === "return" && onAccept && !hasBindingContext) {
      onAccept(currentIndex);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onRowKeyDown?.(event, currentIndex);
  }
  let lineScroll = useLineScroll({
    lineCount: size,
    visibleCount,
    cursorLine: rowStartLines[cursor] ?? 0,
    getCursorLine: () => rowStartLines[getCursor()] ?? 0,
    headings: headingSet,
    boundaries: anchorLines,
    markerLines,
    onScroll: (windowStart, windowEnd) => {
      let currentIndex = getCursor();
      let minRow = lineToRow[windowStart] ?? 0;
      let maxRow = (lineToRow[windowEnd] ?? count) - 1;
      setCursor(minRow > maxRow ? currentIndex : clamp(currentIndex, minRow, maxRow));
    },
  });
  function handleWheel(event) {
    if (event.deltaY === 0 || isDisabledValue(isDisabled)) return;
    lineScroll.scrollBy(event.deltaY > 0 ? 1 : -1);
    event.stopImmediatePropagation();
  }
  function scrollToEdge(index, force = false) {
    if (!force && isDisabledValue(isDisabled)) return;
    lineScroll.scrollTo(index < 0 ? 0 : size);
  }
  function setCursorTo(index) {
    lineScroll.pin();
    setCursor(clamp(index, 0, max));
  }
  return {
    cursor,
    windowStart: lineScroll.windowStart,
    windowEnd: lineScroll.windowEnd,
    spareLines: lineScroll.spareLines,
    moreAbove: lineToRow[lineScroll.windowStart] ?? 0,
    moreBelow: count - (lineToRow[lineScroll.windowEnd] ?? count),
    isCursor: (index) => index === cursor && count > 0,
    hasFocus,
    scrollBar: {
      ...lineScroll.bar,
      onScrollTo: isDisabledNow ? undefined : lineScroll.bar.onScrollTo,
      onScrollBy: isDisabledNow ? undefined : lineScroll.bar.onScrollBy,
    },
    setCursor: setCursorTo,
    scrollToEdge,
    containerRef,
    bind: {
      ref: containerRef,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onWheel: !isDisabledNow && !lineScroll.fits ? handleWheel : undefined,
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
function addNumbers(a, b) {
  return a + b;
}
//@ chunk-r68xwcze.js:12326-12350 placement
var MIN_MENU_ROWS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MIN_MENU_ROWS_HALF;
var MENU_OPEN_CONTEXT;
deferInit("chunk-r68xwcze.js:12326", () => {
  MIN_MENU_ROWS = 3;
  MIN_MENU_ROWS_HALF = 7;
  MENU_OPEN_CONTEXT = createContext(false);
});
//@ chunk-r68xwcze.js:12350-12378 placement
/**
 * 当前菜单是否处于展开态（读 Eo context）。
 */
function isMenuOpen() {
  return useContext(MENU_OPEN_CONTEXT);
}
//@ chunk-r68xwcze.js:12378-13751 placement
function SelectGroup(props) {
  let $ = useMemoCache(27);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { onFocus, onSelect } = props;
  if (isScreenReaderEnabled && onSelect !== undefined) {
    let headingsByIndexCached;
    let items;
    if ($[0] !== props.children) {
      items = [];
      headingsByIndexCached = new Map();
      for (const child of childrenExport.toArray(props.children)) {
        if (!isGroupHeading(child)) {
          items.push(child);
          continue;
        }
        headingsByIndexCached.set(items.length, [...(headingsByIndexCached.get(items.length) ?? []), child]);
      }
      $[0] = props.children;
      $[1] = headingsByIndexCached;
      $[2] = items;
    } else {
      headingsByIndexCached = $[1];
      items = $[2];
    }
    if (items.length === 0) {
      let emptyElement;
      if ($[3] !== props.emptyMessage) {
        emptyElement = props.emptyMessage
          ? jsxProd_default(Text, {
              children: props.emptyMessage,
            })
          : null;
        $[3] = props.emptyMessage;
        $[4] = emptyElement;
      } else emptyElement = $[4];
      return emptyElement;
    }
    let onKeyDown;
    if ($[5] !== props.isDisabled) {
      onKeyDown = (event) => {
        if (isDisabledValue(props.isDisabled) || event.ctrl || event.meta) {
          return;
        }
        if (event.key === "return" || event.key === " ") event.stopPropagation();
      };
      $[5] = props.isDisabled;
      $[6] = onKeyDown;
    } else onKeyDown = $[6];
    let options;
    if ($[7] !== items) {
      options = items.map(labelValueOption);
      $[7] = items;
      $[8] = options;
    } else options = $[8];
    let isDisabled;
    if ($[9] !== props.isDisabled) {
      isDisabled = isDisabledValue(props.isDisabled);
      $[9] = props.isDisabled;
      $[10] = isDisabled;
    } else isDisabled = $[10];
    let onChange;
    if ($[11] !== onFocus || $[12] !== onSelect) {
      onChange = (selectedValue) => {
        onFocus?.(selectedValue);
        onSelect(selectedValue);
      };
      $[11] = onFocus;
      $[12] = onSelect;
      $[13] = onChange;
    } else onChange = $[13];
    let children;
    if (
      $[14] !== headingsByIndexCached ||
      $[15] !== onFocus ||
      $[16] !== options ||
      $[17] !== isDisabled ||
      $[18] !== onChange
    ) {
      children = jsxProd_default(Select, {
        options,
        headings: headingsByIndexCached,
        drawLabels: true,
        isDisabled,
        onFocus,
        onChange,
      });
      $[14] = headingsByIndexCached;
      $[15] = onFocus;
      $[16] = options;
      $[17] = isDisabled;
      $[18] = onChange;
      $[19] = children;
    } else children = $[19];
    let groupElement;
    if ($[20] !== onKeyDown || $[21] !== children) {
      groupElement = jsxProd_default(Box, {
        flexDirection: "column",
        onKeyDown,
        children,
      });
      $[20] = onKeyDown;
      $[21] = children;
      $[22] = groupElement;
    } else groupElement = $[22];
    return groupElement;
  }
  if (props.visibleCount === undefined) {
    let containerElement;
    if ($[23] !== props) {
      containerElement = jsxProd_default(SelectContainer, {
        ...props,
      });
      $[23] = props;
      $[24] = containerElement;
    } else containerElement = $[24];
    return containerElement;
  }
  let stateElement;
  if ($[25] !== props) {
    stateElement = jsxProd_default(useSelectState, {
      props,
      visibleCount: props.visibleCount,
    });
    $[25] = props;
    $[26] = stateElement;
  } else stateElement = $[26];
  return stateElement;
}
//@ chunk-r68xwcze.js:13751-15571 placement
function SelectContainer(props) {
  let $ = useMemoCache(21);
  let scrollColumnContext = useScrollColumnContext();
  let rowsContextSlot = useContext(ContextSlotA);
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let owesRows = rowsContextSlot !== null && !hasScrollViewport;
  let boxRef = useRef(null);
  let chromeAboveFn;
  if ($[0] !== owesRows || $[1] !== scrollColumnContext) {
    chromeAboveFn = () => {
      let ownBox = boxRef.current;
      if (ownBox === null) {
        return null;
      }
      let node = scrollColumnContext?.box.current ?? ownBox;
      while (scrollColumnContext === null && !owesRows && node.parentNode !== undefined)
        node = node.parentNode;
      return measureElement(node).height - measureElement(ownBox).height;
    };
    $[0] = owesRows;
    $[1] = scrollColumnContext;
    $[2] = chromeAboveFn;
  } else chromeAboveFn = $[2];
  let measured = useMeasured(chromeAboveFn);
  let rowsAboveFn;
  if ($[3] !== rowsContextSlot || $[4] !== scrollColumnContext?.box.current) {
    rowsAboveFn = () => {
      let containerNode = scrollColumnContext?.box.current ?? boxRef.current;
      let reservedRows = rowsContextSlot === null ? null : rowsContextSlot();
      return containerNode === null || reservedRows === null
        ? null
        : reservedRows + measureElement(containerNode).height;
    };
    $[3] = rowsContextSlot;
    $[4] = scrollColumnContext?.box.current;
    $[5] = rowsAboveFn;
  } else rowsAboveFn = $[5];
  let measured_2 = useMeasured(rowsAboveFn);
  let owedSlot = useContext(contextSlot);
  let lineCountCached;
  if ($[6] !== props.children || $[7] !== props.emptyMessage) {
    let children = childrenExport.toArray(props.children);
    lineCountCached = children.every(isGroupHeading)
      ? Number(Boolean(props.emptyMessage))
      : children.map(optionLineCount).reduce(addNumbers, 0);
    $[6] = props.children;
    $[7] = props.emptyMessage;
    $[8] = lineCountCached;
  } else lineCountCached = $[8];
  let lineCount = lineCountCached;
  let wantedRows =
    props.maxVisibleCount === undefined ? lineCount : Math.min(lineCount, props.maxVisibleCount);
  let oweEffect;
  let oweDeps;
  if ($[9] !== owedSlot || $[10] !== owesRows || $[11] !== wantedRows) {
    oweEffect = () =>
      owesRows
        ? owedSlot?.({
            rows: () => (boxRef.current === null ? wantedRows : measureElement(boxRef.current).height),
            owed: wantedRows,
          })
        : undefined;
    oweDeps = [owesRows, owedSlot, wantedRows];
    $[9] = owedSlot;
    $[10] = owesRows;
    $[11] = wantedRows;
    $[12] = oweEffect;
    $[13] = oweDeps;
  } else {
    oweEffect = $[12];
    oweDeps = $[13];
  }
  useLayoutEffect(oweEffect, oweDeps);
  let widthFn;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    widthFn = () => (boxRef.current === null ? 0 : measureElement(boxRef.current).width);
    $[14] = widthFn;
  } else widthFn = $[14];
  let measured_3 = useMeasured(widthFn);
  let [layoutState, setLayoutState] = useState(null);
  let availableRows = hasScrollViewport ? (scrollColumnContext?.rows ?? rows) : terminalSize.rows;
  let layoutValid = layoutState?.rows === availableRows && layoutState.width === measured_3;
  if (measured !== null && (layoutState === null || !layoutValid || measured > layoutState.chrome))
    setLayoutState({
      rows: availableRows,
      width: measured_3,
      chrome: measured,
    });
  let chromeHeight = layoutValid ? Math.max(layoutState.chrome, measured ?? layoutState.chrome) : measured;
  let roomRows = hasScrollViewport
    ? availableRows
    : owesRows
      ? measured_2
      : terminalSize.rows - (scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS);
  let menuRows =
    chromeHeight === null || roomRows === null
      ? MIN_MENU_ROWS
      : hasScrollViewport || owesRows
        ? roomRows - chromeHeight
        : Math.min(Math.max(MIN_MENU_ROWS_HALF, Math.floor(terminalSize.rows / 2)), roomRows - chromeHeight);
  let visibleRows =
    props.maxVisibleCount === undefined ? menuRows : Math.min(menuRows, props.maxVisibleCount);
  let max = Math.max(1, visibleRows);
  let overflowHint =
    max === 1
      ? "none"
      : max < MIN_MENU_ROWS && props.overflowHint !== "none"
        ? "glyph"
        : props.overflowHint === "count"
          ? undefined
          : props.overflowHint;
  let props_2;
  if ($[15] !== overflowHint || $[16] !== props) {
    props_2 = {
      ...props,
      overflowHint,
    };
    $[15] = overflowHint;
    $[16] = props;
    $[17] = props_2;
  } else props_2 = $[17];
  let containerElement;
  if ($[18] !== max || $[19] !== props_2) {
    containerElement = jsxProd_default(Box, {
      ref: boxRef,
      flexDirection: "column",
      children: jsxProd_default(useSelectState, {
        props: props_2,
        visibleCount: max,
      }),
    });
    $[18] = max;
    $[19] = props_2;
    $[20] = containerElement;
  } else containerElement = $[20];
  return containerElement;
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
  let childArray = childrenExport.toArray(children);
  let heights = [];
  let totalLines = 0;
  for (let child of childArray) {
    heights.push(optionLineCount(child));
    totalLines += heights.at(-1) ?? 1;
  }
  let needsIndicator = overflowHint === undefined && totalLines > visibleCount;
  let rowsPerWindow = needsIndicator ? Math.max(1, visibleCount - 2) : visibleCount;
  let usesMoreRow = needsIndicator && rowsPerWindow === visibleCount - 2;
  let headingLines = [];
  let rowHeights = [];
  let rowKeys = [];
  let lineToRowIndex = [];
  let rowStartLines = [];
  let lineCursor = 0;
  for (let [index, child] of childArray.entries()) {
    lineToRowIndex.push(rowHeights.length);
    rowStartLines.push(lineCursor);
    if (isGroupHeading(child)) {
      headingLines.push(lineCursor++);
      continue;
    }
    rowHeights.push(Math.min(heights[index] ?? 1, rowsPerWindow));
    rowKeys.push(isValidElement_default(child) ? (child.key ?? undefined) : undefined);
    lineCursor += rowHeights.at(-1) ?? 1;
  }
  let rowCount = rowHeights.length;
  let isListDisabled = isDisabledValue(isDisabled);
  let lastFocusRef = useRef(null);
  let { containerRef, ...cursorApi } = useSelectCursor({
    count: rowCount,
    visibleCount: rowsPerWindow,
    moreRowLines: usesMoreRow,
    headingLines,
    rowHeights,
    rowKeys,
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
    onCursorChange: (index) => {
      lastFocusRef.current = {
        cursor: index,
        count: rowCount,
      };
      onFocus?.(index);
    },
  });
  let emitFocus = useEffectEvent((index) => onFocus?.(index));
  useEffect(() => {
    let previous = lastFocusRef.current;
    if (rowCount === 0 || (previous?.cursor === cursorApi.cursor && previous.count === rowCount)) return;
    lastFocusRef.current = {
      cursor: cursorApi.cursor,
      count: rowCount,
    };
    emitFocus(cursorApi.cursor);
  }, [cursorApi.cursor, rowCount]);
  useFocusOnMount(containerRef, !isListDisabled);
  let strayClickGuard = useStrayClickGuard();
  let strayClickFilter = useStrayClickFilter();
  let shouldDropClick = (event) => strayClickGuard(event) || strayClickFilter.dropsClick(event);
  if (rowCount === 0)
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
  let overflowIndicator =
    overflowHint === undefined || (overflowHint === "glyph" && visibleCount === 1) ? "count" : overflowHint;
  let { windowStart, windowEnd, moreAbove, moreBelow } = cursorApi;
  let flattened = childArray.flatMap((child, index) => {
    let startLine = rowStartLines[index] ?? 0;
    return startLine >= windowStart && startLine < windowEnd
      ? [
          {
            child,
            index,
            line: startLine,
          },
        ]
      : [];
  });
  let makeIndicatorPress = (direction) =>
    isListDisabled && onDisabledRowClick === undefined
      ? undefined
      : (event) => {
          cursorApi.scrollToEdge(direction, isListDisabled);
          strayClickFilter.pressed(event);
          if (isListDisabled) onDisabledRowClick?.(lastFocusRef.current?.cursor ?? cursorApi.cursor);
        };
  let aboveIndicator =
    overflowIndicator === "count" &&
    jsxProd_default(MoreItemsIndicator, {
      direction: "above",
      count: moreAbove,
      onPress: makeIndicatorPress(-1),
    });
  let belowIndicator =
    overflowIndicator === "count" &&
    jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count: moreBelow,
      onPress: makeIndicatorPress(1),
    });
  let mapped = flattened.map(({ child, index, line }, visibleIndex) => {
    let rowKey = isValidElement_default(child) ? (child.key ?? line) : line;
    let atTopEdge = visibleIndex === 0 && moreAbove > 0;
    let atBottomEdge = visibleIndex === flattened.length - 1 && moreBelow > 0;
    if (isGroupHeading(child))
      return jsxProd_default(
        ListItem,
        {
          isFocused: false,
          showScrollUp: overflowIndicator === "glyph" && atTopEdge,
          showScrollDown: overflowIndicator === "glyph" && atBottomEdge,
          styled: false,
          children: child,
        },
        rowKey,
      );
    let rowIndex = lineToRowIndex[index] ?? 0;
    let isCursor = cursorApi.isCursor(rowIndex);
    return jsxProd_default(
      MENU_OPEN_CONTEXT.Provider,
      {
        value: isCursor && !isListDisabled,
        children: jsxProd_default(Box, {
          flexDirection: "column",
          height: rowHeights[rowIndex],
          overflow: "hidden",
          onClick:
            isListDisabled && onDisabledRowClick !== undefined
              ? (event) => {
                  if (event.droppedAsStray || shouldDropClick(event)) return;
                  cursorApi.setCursor(rowIndex);
                  onDisabledRowClick(rowIndex);
                }
              : rowClick === "move" && !isListDisabled && onSelect !== undefined
                ? (event) => {
                    if (event.droppedAsStray || shouldDropClick(event) || isDisabledValue(isDisabled)) return;
                    cursorApi.setCursor(rowIndex);
                  }
                : undefined,
          children: jsxProd_default(ListItem, {
            isFocused: isCursor,
            idle: isListDisabled,
            showScrollUp: overflowIndicator === "glyph" && atTopEdge,
            showScrollDown: overflowIndicator === "glyph" && atBottomEdge,
            styled,
            hoverStyle,
            declareCursor: !isListDisabled && groupItemProps(child)?.declareCursor !== false,
            onClick:
              isListDisabled || onSelect === undefined || rowClick === "move"
                ? undefined
                : (event) => {
                    if (shouldDropClick(event) || isDisabledValue(isDisabled)) return;
                    cursorApi.setCursor(rowIndex);
                    onSelect(rowIndex);
                  },
            children: child,
          }),
        }),
      },
      rowKey,
    );
  });
  let spareElement =
    cursorApi.spareLines > 0 &&
    jsxProd_default(Box, {
      flexShrink: 0,
      height: cursorApi.spareLines,
    });
  if (!scrollBar)
    return jsxProd_default(NO_FOCUS_CONTEXT, {
      value: strayClickFilter.dropsClick,
      children: jsxProd_default_2(WindowedText, {
        windowStart,
        ...cursorApi.bind,
        children: [aboveIndicator, mapped, spareElement, belowIndicator],
      }),
    });
  let windowedList = jsxProd_default_2(WindowedText, {
    windowStart,
    children: [mapped, spareElement],
  });
  return jsxProd_default(NO_FOCUS_CONTEXT, {
    value: strayClickFilter.dropsClick,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      ...cursorApi.bind,
      children: [
        usesMoreRow ? null : aboveIndicator,
        jsxProd_default_2(SelectRow, {
          bar: usesMoreRow
            ? {
                ...cursorApi.scrollBar,
                arrows: true,
              }
            : cursorApi.scrollBar,
          height: usesMoreRow ? visibleCount : undefined,
          children: [usesMoreRow ? aboveIndicator : null, windowedList, usesMoreRow ? belowIndicator : null],
        }),
        usesMoreRow ? null : belowIndicator,
      ],
    }),
  });
}
//@ chunk-r68xwcze.js:18622-18732 placement
function SelectGroupItem(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let fragment;
  if ($[0] !== children) {
    fragment = jsxProd_default(Fragment, {
      children,
    });
    $[0] = children;
    $[1] = fragment;
  } else fragment = $[1];
  return fragment;
}
//@ chunk-r68xwcze.js:18732-18842 placement
function SelectGroupHeading(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let fragment;
  if ($[0] !== children) {
    fragment = jsxProd_default(Fragment, {
      children,
    });
    $[0] = children;
    $[1] = fragment;
  } else fragment = $[1];
  return fragment;
}
//@ chunk-r68xwcze.js:18842-18883 placement
function isGroupHeading(child) {
  return isValidElement_default(child) && child.type === SelectGroupHeading;
}
//@ chunk-r68xwcze.js:18883-18974 placement
function optionLineCount(child) {
  let lines = groupItemProps(child)?.lines ?? 1;
  return Number.isFinite(lines) ? Math.max(1, Math.trunc(lines)) : 1;
}
//@ chunk-r68xwcze.js:18974-19030 placement
function groupItemProps(child) {
  return isValidElement_default(child) && child.type === SelectGroupItem ? child.props : undefined;
}
//@ chunk-r68xwcze.js:19030-19076 placement
var merged; // deferred: uses SelectGroup of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-r68xwcze.js:19030", () => {
  merged = Object.assign(SelectGroup, {
    Item: SelectGroupItem,
    Heading: SelectGroupHeading,
  });
});
//@ chunk-r68xwcze.js:19076-19105 placement
function newSet() {
  return new Set();
}
//@ chunk-r68xwcze.js:19105-19202 placement
function cursorIndexFor(item) {
  if (!isOrderedListItem(item)) {
    return 0;
  }
  let { icon } = item.props;
  return isValidElement_default(icon) && icon.type === StatusIcon
    ? maxStatusIconWidth()
    : bunStringWidth(reactNodeText(icon));
}
//@ chunk-r68xwcze.js:19202-19250 fingerprint = getTextContent (0.673)
function getTextContent(node) {
  return metaTexts(node.props.meta).length > 0;
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
