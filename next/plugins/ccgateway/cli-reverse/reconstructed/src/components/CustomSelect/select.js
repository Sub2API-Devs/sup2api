/**
 * components/CustomSelect/select.tsx
 *
 * 通用 Select 组件：单选列表，布局 compact/compact-vertical/expanded、数字快捷键、可输入选项、描述两栏、分页视口。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select.tsx
 * pieces: chunk-hnxhr3bs.js (1), chunk-p1yqn9ds.js (15), chunk-tvbhy3tn.js (2), chunk-yz6x5v95.js (44)
 * attribution: fingerprint 4, placement 49, layout 8, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../utils/collections.js";
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
import { NoSelect, isFocusedIn, useFocus, useMeasured } from "../../ink/components/Input.js";
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

//@ chunk-p1yqn9ds.js:42705-42709 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1yqn9ds.js:42705", () => {
  init_react_production();
});
//@ chunk-p1yqn9ds.js:42709-43080 placement
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
//@ chunk-p1yqn9ds.js:43080-43121 layout (2.1.88 match: _temp7, 1)
function isInputOption(opt) {
  return opt.type === "input";
}
//@ chunk-p1yqn9ds.js:43121-43159 file-local
function hasDescription(opt) {
  return opt.description;
}
//@ chunk-p1yqn9ds.js:43159-43200 layout (2.1.88 match: _temp, 1)
function isImagePaste(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:43200-43241 layout (2.1.88 match: _temp, 1)
function isImagePaste_2(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:43241-43282 layout (2.1.88 match: _temp, 1)
function isImagePaste_3(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:43282-43323 layout (2.1.88 match: _temp, 1)
function isImagePaste_4(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:43323-43364 layout (2.1.88 match: _temp, 1)
function isImagePaste_5(c) {
  return c.type === "image";
}
//@ chunk-p1yqn9ds.js:43364-43398 placement
/**
 * 选择列表"尚未提交选择"的哨兵值。
 */
var NO_COMMITTED_ROW; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1yqn9ds.js:43364", () => {
  NO_COMMITTED_ROW = Symbol("NO_COMMITTED_ROW");
});
//@ chunk-p1yqn9ds.js:44205-60697 fingerprint (2.1.88 match: Select, 0.76)
/**
 * 通用单选：按 layout 渲染选项（可带描述、两栏、数字前缀），useSelectState 管理焦点与视口，支持 input 类型选项（就地编辑）、onFocus/onChange/onCancel。
 */
function Select_2(props) {
  let $ = useMemoCache(239);
  let {
    isDisabled,
    hideIndexes,
    disablePrintableKeybindings,
    visibleOptionCount,
    hiddenBelowUnit,
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
  let selectStateArgs;
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
    selectStateArgs = {
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
    $[15] = selectStateArgs;
  } else selectStateArgs = $[15];
  let state = useSelectState_2(selectStateArgs);
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
        let imageCount = countWhere(Object.values(pastedContents), isImagePaste_2);
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
  let containerProps = {
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
    const container = containerProps.container();
    let children;
    if (
      $[57] !== canPasteImage ||
      $[58] !== makeClickHandler ||
      $[59] !== hideIndexesFlag ||
      $[60] !== hoverStyle ||
      $[61] !== imagesSelected ||
      $[62] !== inlineDescriptionsFlag ||
      $[63] !== extraChromeWidth ||
      $[64] !== inputValues ||
      $[65] !== isDisabledFlag ||
      $[66] !== maxIndexWidth ||
      $[67] !== onCancel ||
      $[68] !== onChange ||
      $[69] !== onImagePaste ||
      $[70] !== onOpenEditor ||
      $[71] !== onRemoveImage ||
      $[72] !== options.length ||
      $[73] !== pastedContents ||
      $[74] !== selectedImageIndex ||
      $[75] !== state.focusedValue ||
      $[76] !== state.value ||
      $[77] !== state.visibleFromIndex ||
      $[78] !== state.visibleOptions ||
      $[79] !== state.visibleToIndex
    ) {
      let renderOption;
      if (
        $[81] !== canPasteImage ||
        $[82] !== makeClickHandler ||
        $[83] !== hideIndexesFlag ||
        $[84] !== hoverStyle ||
        $[85] !== imagesSelected ||
        $[86] !== inlineDescriptionsFlag ||
        $[87] !== extraChromeWidth ||
        $[88] !== inputValues ||
        $[89] !== isDisabledFlag ||
        $[90] !== maxIndexWidth ||
        $[91] !== onCancel ||
        $[92] !== onChange ||
        $[93] !== onImagePaste ||
        $[94] !== onOpenEditor ||
        $[95] !== onRemoveImage ||
        $[96] !== options.length ||
        $[97] !== pastedContents ||
        $[98] !== selectedImageIndex ||
        $[99] !== state.focusedValue ||
        $[100] !== state.value ||
        $[101] !== state.visibleFromIndex ||
        $[102] !== state.visibleToIndex
      ) {
        renderOption = (option, index) => {
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
          let isDisabledOption = option.disabled === true;
          let optionColor = isDisabledOption
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
                    dimColor: isDisabledOption,
                    color: optionColor,
                    children: label,
                  }),
                }),
                option.description &&
                  jsxProd_default(Box, {
                    paddingLeft: 2,
                    children: jsxProd_default(Text, {
                      dimColor: isDisabledOption || option.dimDescription !== false,
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
        };
        $[81] = canPasteImage;
        $[82] = makeClickHandler;
        $[83] = hideIndexesFlag;
        $[84] = hoverStyle;
        $[85] = imagesSelected;
        $[86] = inlineDescriptionsFlag;
        $[87] = extraChromeWidth;
        $[88] = inputValues;
        $[89] = isDisabledFlag;
        $[90] = maxIndexWidth;
        $[91] = onCancel;
        $[92] = onChange;
        $[93] = onImagePaste;
        $[94] = onOpenEditor;
        $[95] = onRemoveImage;
        $[96] = options.length;
        $[97] = pastedContents;
        $[98] = selectedImageIndex;
        $[99] = state.focusedValue;
        $[100] = state.value;
        $[101] = state.visibleFromIndex;
        $[102] = state.visibleToIndex;
        $[103] = renderOption;
      } else renderOption = $[103];
      children = state.visibleOptions.map(renderOption);
      $[57] = canPasteImage;
      $[58] = makeClickHandler;
      $[59] = hideIndexesFlag;
      $[60] = hoverStyle;
      $[61] = imagesSelected;
      $[62] = inlineDescriptionsFlag;
      $[63] = extraChromeWidth;
      $[64] = inputValues;
      $[65] = isDisabledFlag;
      $[66] = maxIndexWidth;
      $[67] = onCancel;
      $[68] = onChange;
      $[69] = onImagePaste;
      $[70] = onOpenEditor;
      $[71] = onRemoveImage;
      $[72] = options.length;
      $[73] = pastedContents;
      $[74] = selectedImageIndex;
      $[75] = state.focusedValue;
      $[76] = state.value;
      $[77] = state.visibleFromIndex;
      $[78] = state.visibleOptions;
      $[79] = state.visibleToIndex;
      $[80] = children;
    } else children = $[80];
    return jsxProd_default(WindowedRowsBox, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children,
    });
  }
  if (layoutMode === "compact-vertical") {
    let t18;
    if ($[104] !== hideIndexesFlag || $[105] !== state.options) {
      t18 = hideIndexesFlag ? 0 : state.options.length.toString().length;
      $[104] = hideIndexesFlag;
      $[105] = state.options;
      $[106] = t18;
    } else t18 = $[106];
    let indexWidth = t18;
    const container = containerProps.container();
    let children;
    if (
      $[107] !== canPasteImage ||
      $[108] !== makeClickHandler ||
      $[109] !== hideIndexesFlag ||
      $[110] !== hoverStyle ||
      $[111] !== imagesSelected ||
      $[112] !== inlineDescriptionsFlag ||
      $[113] !== extraChromeWidth ||
      $[114] !== inputValues ||
      $[115] !== isDisabledFlag ||
      $[116] !== indexWidth ||
      $[117] !== onCancel ||
      $[118] !== onChange ||
      $[119] !== onImagePaste ||
      $[120] !== onOpenEditor ||
      $[121] !== onRemoveImage ||
      $[122] !== options.length ||
      $[123] !== pastedContents ||
      $[124] !== selectedImageIndex ||
      $[125] !== state.focusedValue ||
      $[126] !== state.value ||
      $[127] !== state.visibleFromIndex ||
      $[128] !== state.visibleOptions ||
      $[129] !== state.visibleToIndex
    ) {
      let renderOption_2;
      if (
        $[131] !== canPasteImage ||
        $[132] !== makeClickHandler ||
        $[133] !== hideIndexesFlag ||
        $[134] !== hoverStyle ||
        $[135] !== imagesSelected ||
        $[136] !== inlineDescriptionsFlag ||
        $[137] !== extraChromeWidth ||
        $[138] !== inputValues ||
        $[139] !== isDisabledFlag ||
        $[140] !== indexWidth ||
        $[141] !== onCancel ||
        $[142] !== onChange ||
        $[143] !== onImagePaste ||
        $[144] !== onOpenEditor ||
        $[145] !== onRemoveImage ||
        $[146] !== options.length ||
        $[147] !== pastedContents ||
        $[148] !== selectedImageIndex ||
        $[149] !== state.focusedValue ||
        $[150] !== state.value ||
        $[151] !== state.visibleFromIndex ||
        $[152] !== state.visibleToIndex
      ) {
        renderOption_2 = (option, index) => {
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
                maxIndexWidth: indexWidth,
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
          let label_0 = option.label;
          let isDisabledOption_2 = option.disabled === true;
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
                          children: `${i_0}.`.padEnd(indexWidth + 1),
                        }),
                      jsxProd_default(Text, {
                        dimColor: isDisabledOption_2,
                        color: isDisabledOption_2
                          ? undefined
                          : isSelected
                            ? "success"
                            : isFocused
                              ? "suggestion"
                              : undefined,
                        children: label_0,
                      }),
                    ],
                  }),
                }),
                option.description &&
                  jsxProd_default(Box, {
                    paddingLeft: hideIndexesFlag ? 4 : indexWidth + 4,
                    children: jsxProd_default(Text, {
                      dimColor: isDisabledOption_2 || option.dimDescription !== false,
                      color: isDisabledOption_2
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
        };
        $[131] = canPasteImage;
        $[132] = makeClickHandler;
        $[133] = hideIndexesFlag;
        $[134] = hoverStyle;
        $[135] = imagesSelected;
        $[136] = inlineDescriptionsFlag;
        $[137] = extraChromeWidth;
        $[138] = inputValues;
        $[139] = isDisabledFlag;
        $[140] = indexWidth;
        $[141] = onCancel;
        $[142] = onChange;
        $[143] = onImagePaste;
        $[144] = onOpenEditor;
        $[145] = onRemoveImage;
        $[146] = options.length;
        $[147] = pastedContents;
        $[148] = selectedImageIndex;
        $[149] = state.focusedValue;
        $[150] = state.value;
        $[151] = state.visibleFromIndex;
        $[152] = state.visibleToIndex;
        $[153] = renderOption_2;
      } else renderOption_2 = $[153];
      children = state.visibleOptions.map(renderOption_2);
      $[107] = canPasteImage;
      $[108] = makeClickHandler;
      $[109] = hideIndexesFlag;
      $[110] = hoverStyle;
      $[111] = imagesSelected;
      $[112] = inlineDescriptionsFlag;
      $[113] = extraChromeWidth;
      $[114] = inputValues;
      $[115] = isDisabledFlag;
      $[116] = indexWidth;
      $[117] = onCancel;
      $[118] = onChange;
      $[119] = onImagePaste;
      $[120] = onOpenEditor;
      $[121] = onRemoveImage;
      $[122] = options.length;
      $[123] = pastedContents;
      $[124] = selectedImageIndex;
      $[125] = state.focusedValue;
      $[126] = state.value;
      $[127] = state.visibleFromIndex;
      $[128] = state.visibleOptions;
      $[129] = state.visibleToIndex;
      $[130] = children;
    } else children = $[130];
    return jsxProd_default(WindowedRowsBox, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children,
    });
  }
  let indexWidthCached;
  if ($[154] !== sizingOptions || $[155] !== hideIndexesFlag) {
    indexWidthCached = hideIndexesFlag ? 0 : sizingOptions.length.toString().length;
    $[154] = sizingOptions;
    $[155] = hideIndexesFlag;
    $[156] = indexWidthCached;
  } else indexWidthCached = $[156];
  let indexWidth = indexWidthCached;
  if (useVerticalLayout) {
    let indexColumnWidth;
    let maxRowWidth;
    if (
      $[157] !== columns ||
      $[158] !== sizingOptions ||
      $[159] !== hideIndexesFlag ||
      $[160] !== indexWidth ||
      $[161] !== state.value
    ) {
      indexColumnWidth = hideIndexesFlag ? 0 : indexWidth + 2;
      let labelColumnWidthCached;
      if ($[164] !== sizingOptions || $[165] !== indexColumnWidth || $[166] !== state.value) {
        let measureRowWidth;
        if ($[168] !== indexColumnWidth || $[169] !== state.value) {
          measureRowWidth = (option) => {
            if (option.type === "input") {
              return 0;
            }
            let selectionPad = state.value === option.value ? 2 : 0;
            return 2 + indexColumnWidth + bunStringWidth(reactNodeText(option.label)) + selectionPad;
          };
          $[168] = indexColumnWidth;
          $[169] = state.value;
          $[170] = measureRowWidth;
        } else measureRowWidth = $[170];
        labelColumnWidthCached = Math.max(...sizingOptions.map(measureRowWidth));
        $[164] = sizingOptions;
        $[165] = indexColumnWidth;
        $[166] = state.value;
        $[167] = labelColumnWidthCached;
      } else labelColumnWidthCached = $[167];
      maxRowWidth = Math.min(labelColumnWidthCached, Math.floor(columns * MAX_WIDTH_RATIO));
      $[157] = columns;
      $[158] = sizingOptions;
      $[159] = hideIndexesFlag;
      $[160] = indexWidth;
      $[161] = state.value;
      $[162] = indexColumnWidth;
      $[163] = maxRowWidth;
    } else {
      indexColumnWidth = $[162];
      maxRowWidth = $[163];
    }
    let renderOption_3;
    if (
      $[171] !== indexColumnWidth ||
      $[172] !== isDisabledFlag ||
      $[173] !== maxRowWidth ||
      $[174] !== options.length ||
      $[175] !== state.focusedValue ||
      $[176] !== state.value ||
      $[177] !== state.visibleFromIndex ||
      $[178] !== state.visibleToIndex
    ) {
      renderOption_3 = (option, index) => {
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
      };
      $[171] = indexColumnWidth;
      $[172] = isDisabledFlag;
      $[173] = maxRowWidth;
      $[174] = options.length;
      $[175] = state.focusedValue;
      $[176] = state.value;
      $[177] = state.visibleFromIndex;
      $[178] = state.visibleToIndex;
      $[179] = renderOption_3;
    } else renderOption_3 = $[179];
    let mapped = state.visibleOptions.map(renderOption_3);
    const container = containerProps.container();
    let renderRow;
    if (
      $[180] !== makeClickHandler ||
      $[181] !== hideIndexesFlag ||
      $[182] !== hoverStyle ||
      $[183] !== indexWidth ||
      $[184] !== maxRowWidth
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
      $[180] = makeClickHandler;
      $[181] = hideIndexesFlag;
      $[182] = hoverStyle;
      $[183] = indexWidth;
      $[184] = maxRowWidth;
      $[185] = renderRow;
    } else renderRow = $[185];
    return jsxProd_default(WindowedRowsBox, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children: mapped.map(renderRow),
    });
  }
  const RowsBoxComponent = WindowedRowsBox;
  const container = containerProps.container();
  let children;
  if (
    $[186] !== canPasteImage ||
    $[187] !== makeClickHandler ||
    $[188] !== hideIndexesFlag ||
    $[189] !== hoverStyle ||
    $[190] !== imagesSelected ||
    $[191] !== inlineDescriptionsFlag ||
    $[192] !== extraChromeWidth ||
    $[193] !== inputValues ||
    $[194] !== isDisabledFlag ||
    $[195] !== indexWidth ||
    $[196] !== onCancel ||
    $[197] !== onChange ||
    $[198] !== onImagePaste ||
    $[199] !== onOpenEditor ||
    $[200] !== onRemoveImage ||
    $[201] !== options.length ||
    $[202] !== pastedContents ||
    $[203] !== selectedImageIndex ||
    $[204] !== state.focusedValue ||
    $[205] !== state.value ||
    $[206] !== state.visibleFromIndex ||
    $[207] !== state.visibleOptions ||
    $[208] !== state.visibleToIndex
  ) {
    let renderOption_4;
    if (
      $[210] !== canPasteImage ||
      $[211] !== makeClickHandler ||
      $[212] !== hideIndexesFlag ||
      $[213] !== hoverStyle ||
      $[214] !== imagesSelected ||
      $[215] !== inlineDescriptionsFlag ||
      $[216] !== extraChromeWidth ||
      $[217] !== inputValues ||
      $[218] !== isDisabledFlag ||
      $[219] !== indexWidth ||
      $[220] !== onCancel ||
      $[221] !== onChange ||
      $[222] !== onImagePaste ||
      $[223] !== onOpenEditor ||
      $[224] !== onRemoveImage ||
      $[225] !== options.length ||
      $[226] !== pastedContents ||
      $[227] !== selectedImageIndex ||
      $[228] !== state.focusedValue ||
      $[229] !== state.value ||
      $[230] !== state.visibleFromIndex ||
      $[231] !== state.visibleToIndex
    ) {
      renderOption_4 = (option, index) => {
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
                let hasImageAttachments =
                  pastedContents && Object.values(pastedContents).some(isImagePaste_5);
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
        let isFirstVisible = option.index === state.visibleFromIndex;
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
            shouldShowUpArrow: areMoreOptionsAbove && isFirstVisible,
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
      };
      $[210] = canPasteImage;
      $[211] = makeClickHandler;
      $[212] = hideIndexesFlag;
      $[213] = hoverStyle;
      $[214] = imagesSelected;
      $[215] = inlineDescriptionsFlag;
      $[216] = extraChromeWidth;
      $[217] = inputValues;
      $[218] = isDisabledFlag;
      $[219] = indexWidth;
      $[220] = onCancel;
      $[221] = onChange;
      $[222] = onImagePaste;
      $[223] = onOpenEditor;
      $[224] = onRemoveImage;
      $[225] = options.length;
      $[226] = pastedContents;
      $[227] = selectedImageIndex;
      $[228] = state.focusedValue;
      $[229] = state.value;
      $[230] = state.visibleFromIndex;
      $[231] = state.visibleToIndex;
      $[232] = renderOption_4;
    } else renderOption_4 = $[232];
    children = state.visibleOptions.map(renderOption_4);
    $[186] = canPasteImage;
    $[187] = makeClickHandler;
    $[188] = hideIndexesFlag;
    $[189] = hoverStyle;
    $[190] = imagesSelected;
    $[191] = inlineDescriptionsFlag;
    $[192] = extraChromeWidth;
    $[193] = inputValues;
    $[194] = isDisabledFlag;
    $[195] = indexWidth;
    $[196] = onCancel;
    $[197] = onChange;
    $[198] = onImagePaste;
    $[199] = onOpenEditor;
    $[200] = onRemoveImage;
    $[201] = options.length;
    $[202] = pastedContents;
    $[203] = selectedImageIndex;
    $[204] = state.focusedValue;
    $[205] = state.value;
    $[206] = state.visibleFromIndex;
    $[207] = state.visibleOptions;
    $[208] = state.visibleToIndex;
    $[209] = children;
  } else children = $[209];
  let selectElement;
  if (
    $[233] !== RowsBoxComponent ||
    $[234] !== hiddenBelow_2 ||
    $[235] !== rows ||
    $[236] !== container ||
    $[237] !== children
  ) {
    selectElement = jsxProd_default(RowsBoxComponent, {
      container,
      rows,
      hiddenBelow: hiddenBelow_2,
      children,
    });
    $[233] = RowsBoxComponent;
    $[234] = hiddenBelow_2;
    $[235] = rows;
    $[236] = container;
    $[237] = children;
    $[238] = selectElement;
  } else selectElement = $[238];
  return selectElement;
}
//@ chunk-p1yqn9ds.js:60697-60714 layout
/**
 * 菜单垂直装饰预留 8 行与最大宽度比例 0.6。
 */
var MENU_VERTICAL_CHROME_ROWS = 8;
var MAX_WIDTH_RATIO = 0.6;
//@ chunk-p1yqn9ds.js:60714-60872 placement
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
//@ chunk-p1yqn9ds.js:60872-61146 placement
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
//@ chunk-p1yqn9ds.js:61146-62334 placement
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
//@ chunk-tvbhy3tn.js:1310-1314 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvbhy3tn.js:1310", () => {
  init_react_production();
});
//@ chunk-tvbhy3tn.js:1314-1643 fingerprint (2.1.88 match: TwoColumnRow, 0.735)
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
//@ chunk-hnxhr3bs.js:86397-86783 fingerprint (2.1.88 match: _temp4, 0.642)
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
  let bodyText;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: AUTO_DEFAULT_NOTICE_TITLE,
    });
    bodyText = jsxProd_default(Text, {
      dimColor: true,
      children: AUTO_DEFAULT_NOTICE_BODY,
    });
    $[2] = titleText;
    $[3] = bodyText;
  } else {
    titleText = $[2];
    bodyText = $[3];
  }
  let noticeBox;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    noticeBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        titleText,
        bodyText,
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
//@ chunk-yz6x5v95.js:1156-1160 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:1156", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:1160-1164 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:1160", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:1164-1168 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:1164", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:1168-1172 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:1168", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:1172-1201 placement
var MULTI_CLICK_MIN_MS = 150;
var MULTI_CLICK_MAX_MS_2 = 400;
var CLICK_TIME_SLOP_MS = 60;
var CLICK_CELL_SLOP = 1;
//@ chunk-yz6x5v95.js:1201-1278 placement (2.1.88 match: comparePoints, 0.803)
function isNearPoint(a, b) {
  return Math.abs(b.col - a.col) <= CLICK_CELL_SLOP && Math.abs(b.row - a.row) <= CLICK_CELL_SLOP;
}
//@ chunk-yz6x5v95.js:1278-2652 layout
function PressableRow({ children, paddingX = 0, onPress, repeat = false }) {
  let clock = useClock();
  let strayClickGuard = useStrayClickGuard();
  let backgroundMode = userMessageBackgroundMode();
  let [isHovered, setIsHovered] = useState(false);
  let [isPressed, setIsPressed] = useState(false);
  let pressStart = useRef(null);
  let [pendingClick, setPendingClick] = useState(null);
  let clickTimer = useRef(null);
  useEffect(() => () => clickTimer.current?.(), []);
  let isPressable = onPress !== undefined;
  if (!isPressable && (isHovered || isPressed || pendingClick !== null)) {
    setIsHovered(false);
    setIsPressed(false);
    setPendingClick(null);
  }
  useEffect(() => {
    if (!isPressable) pressStart.current = null;
  }, [isPressable]);
  let repeatPress = useEffectEvent((click) => {
    let press = pressStart.current;
    if (press !== click) return;
    press.hasActed = true;
    onPress?.({
      row: press.row,
    });
  });
  useEffect(() => {
    if (pendingClick === null) return;
    let repeatTimer = clock.setTimeout(function repeatTick() {
      repeatPress(pendingClick);
      repeatTimer = clock.setTimeout(repeatTick, CLICK_TIME_SLOP_MS);
    }, MULTI_CLICK_MAX_MS_2);
    return () => repeatTimer();
  }, [pendingClick, clock]);
  function handleClick(event) {
    event.stopImmediatePropagation();
    if (clickTimer.current !== null || strayClickGuard(event)) return;
    event.endClickChain();
    setIsPressed(true);
    clickTimer.current = clock.setTimeout(() => {
      clickTimer.current = null;
      setIsPressed(false);
      onPress?.(event);
    }, MULTI_CLICK_MIN_MS);
  }
  function handlePointer(event) {
    if (event.type === "down" && event.button === 0) {
      let pressStart_2 = {
        col: event.col,
        row: event.row,
        hasActed: false,
      };
      pressStart.current = pressStart_2;
      setIsPressed(true);
      setPendingClick(pressStart_2);
    } else if (event.type === "up") {
      let press = pressStart.current;
      pressStart.current = null;
      setIsPressed(false);
      setPendingClick(null);
      if (press !== null && !press.hasActed && !event.isUnreported && isNearPoint(press, event))
        onPress?.({
          row: press.row,
        });
    }
  }
  let isInverseBackground = backgroundMode === "inverse";
  let backgroundColor = isInverseBackground
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
    onPointer: isPressable && repeat ? handlePointer : undefined,
    onMouseEnter: isPressable ? () => setIsHovered(true) : undefined,
    onMouseLeave: isPressable ? () => setIsHovered(false) : undefined,
    hoverFollowsPaint: isPressable,
    noSelect: true,
    children: [
      jsxProd_default(Text, {
        color: isPressed && !isInverseBackground ? "inverseText" : undefined,
        dimColor: !isPressed,
        inverse: isPressed && isInverseBackground,
        wrap: "truncate-end",
        children:
          isHovered && !isPressed && isInverseBackground
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
//@ chunk-yz6x5v95.js:2652-2664 placement
var HIGHLIGHT_REFRESH_MS = 1000;
//@ chunk-yz6x5v95.js:2664-2945 placement
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
//@ chunk-yz6x5v95.js:2945-2964 placement
/**
 * 恒为 false 的焦点 context（没有真实焦点时的默认值）。
 */
var NO_FOCUS_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:2945", () => {
  NO_FOCUS_CONTEXT = createContext(() => false);
});
//@ chunk-yz6x5v95.js:2964-3336 placement
function MoreItemsIndicator(props) {
  let $ = useMemoCache(6);
  let { direction, count, onPress } = props;
  if (count <= 0) {
    return null;
  }
  let arrow = direction === "above" ? UP_ARROW : DOWN_ARROW;
  const ariaLabel = `${count} more ${direction}`;
  const children = `${arrow} ${count} more`;
  let children_2;
  if ($[0] !== onPress || $[1] !== children) {
    children_2 = jsxProd_default(PressableRow, {
      paddingX: 1,
      onPress,
      children,
    });
    $[0] = onPress;
    $[1] = children;
    $[2] = children_2;
  } else children_2 = $[2];
  let indicator;
  if ($[3] !== ariaLabel || $[4] !== children_2) {
    indicator = jsxProd_default(Box, {
      paddingLeft: 1,
      "aria-label": ariaLabel,
      children: children_2,
    });
    $[3] = ariaLabel;
    $[4] = children_2;
    $[5] = indicator;
  } else indicator = $[5];
  return indicator;
}
//@ chunk-yz6x5v95.js:3336-3340 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:3336", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:3340-3344 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:3340", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:3344-3444 placement
function useHoverTrackingEnabled() {
  let alternateScreen = useContext(AlternateScreenContext);
  let { subscribeHoverTracked, isHoverTracked } = useContext(APP_CONTEXT);
  let hoverTracked = useSyncExternalStore(subscribeHoverTracked, isHoverTracked);
  return alternateScreen ?? hoverTracked;
}
//@ chunk-yz6x5v95.js:3444-3448 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:3444", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:3448-3457 placement
var MIN_SCROLLBAR_ROWS = 5;
//@ chunk-yz6x5v95.js:3457-6222 placement
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
      jsxProd_default(PressableRow, {
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
      jsxProd_default(PressableRow, {
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
//@ chunk-yz6x5v95.js:6222-6472 placement
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
//@ chunk-yz6x5v95.js:6472-6679 placement
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
//@ chunk-yz6x5v95.js:6679-6742 placement
function repeatCharLines(pipe, count) {
  return Array.from(
    {
      length: count,
    },
    () => pipe,
  ).join(`
`);
}
//@ chunk-yz6x5v95.js:6742-7320 placement
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
//@ chunk-yz6x5v95.js:7320-7324 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:7320", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:7324-7328 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:7324", () => {
  init_react_production();
});
//@ chunk-yz6x5v95.js:7328-7460 placement
/**
 * 按聚焦下标、总数、窗口高度（及可选锚点）算可见窗口 [windowStart, windowEnd) 以及上下各隐藏多少项。
 */
function computeScrollWindow(anchor, count, visible) {
  let start = clamp(anchor - visible + 1, 0, Math.max(0, count - visible));
  let min = Math.min(start + visible, count);
  return {
    windowStart: start,
    windowEnd: min,
    moreAbove: start,
    moreBelow: count - min,
  };
}
//@ chunk-yz6x5v95.js:7460-7475 placement
var EMPTY_HEADINGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz6x5v95.js:7460", () => {
  EMPTY_HEADINGS = new Set();
});
//@ chunk-yz6x5v95.js:7475-9388 placement
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
//@ chunk-yz6x5v95.js:9388-12332 placement
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
  let hovered = isFocusedIn(containerRef);
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
      isActive: hovered && !isDisabledNow && count > 0,
    },
  );
  MessageActionsKeybindings(
    {
      "select:accept": () => (isDisabledValue(isDisabled) ? false : onAccept?.(getCursor())),
    },
    {
      context: keybindingContext,
      isActive: hovered && !isDisabledNow && count > 0 && onAccept !== undefined,
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
    hasFocus: hovered,
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
//@ chunk-yz6x5v95.js:12332-12387 placement
/**
 * 把 isDisabled 属性定为布尔：函数则调用，true 即视为禁用。
 */
function isDisabledValue(isDisabled) {
  return typeof isDisabled === "function" ? isDisabled() : isDisabled === true;
}
//@ chunk-yz6x5v95.js:12387-12428 placement
function labelValueOption(label, value) {
  return {
    label,
    value,
  };
}
//@ chunk-yz6x5v95.js:12428-12458 placement
function addNumbers(a, b) {
  return a + b;
}
//@ chunk-yz6x5v95.js:12458-12482 placement
var MIN_MENU_ROWS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MIN_MENU_ROWS_HALF;
var MENU_OPEN_CONTEXT;
deferInit("chunk-yz6x5v95.js:12458", () => {
  MIN_MENU_ROWS = 3;
  MIN_MENU_ROWS_HALF = 7;
  MENU_OPEN_CONTEXT = createContext(false);
});
//@ chunk-yz6x5v95.js:12482-12510 placement
/**
 * 当前菜单是否处于展开态（读 Eo context）。
 */
function isMenuOpen() {
  return useContext(MENU_OPEN_CONTEXT);
}
//@ chunk-yz6x5v95.js:12510-13883 placement
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
//@ chunk-yz6x5v95.js:13883-15700 placement
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
//@ chunk-yz6x5v95.js:15700-18746 placement
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
//@ chunk-yz6x5v95.js:18746-18857 placement
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
//@ chunk-yz6x5v95.js:18857-18968 placement
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
//@ chunk-yz6x5v95.js:18968-19009 placement
function isGroupHeading(child) {
  return isValidElement_default(child) && child.type === SelectGroupHeading;
}
//@ chunk-yz6x5v95.js:19009-19100 placement
function optionLineCount(child) {
  let lines = groupItemProps(child)?.lines ?? 1;
  return Number.isFinite(lines) ? Math.max(1, Math.trunc(lines)) : 1;
}
//@ chunk-yz6x5v95.js:19100-19156 placement
function groupItemProps(child) {
  return isValidElement_default(child) && child.type === SelectGroupItem ? child.props : undefined;
}
//@ chunk-yz6x5v95.js:19156-19202 placement
var merged; // deferred: uses SelectGroup of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz6x5v95.js:19156", () => {
  merged = Object.assign(SelectGroup, {
    Item: SelectGroupItem,
    Heading: SelectGroupHeading,
  });
});
//@ chunk-yz6x5v95.js:19202-19231 placement
function newSet() {
  return new Set();
}
//@ chunk-yz6x5v95.js:19231-19328 placement
function cursorIndexFor(item) {
  if (!isOrderedListItem(item)) {
    return 0;
  }
  let { icon } = item.props;
  return isValidElement_default(icon) && icon.type === StatusIcon
    ? maxStatusIconWidth()
    : bunStringWidth(reactNodeText(icon));
}
//@ chunk-yz6x5v95.js:19328-19376 fingerprint (2.1.88 match: getTextContent, 0.673)
function getTextContent(node) {
  return metaTexts(node.props.meta).length > 0;
}
export {
  MoreItemsIndicator,
  TwoColumnRow,
  NO_COMMITTED_ROW,
  merged,
  isMenuOpen,
  computeScrollWindow,
  fitVisibleOptionCount,
  PressableRow,
  AutoModeDefaultNotice,
  MAX_WIDTH_RATIO,
  useSelectWheel,
  isDisabledValue,
  NO_FOCUS_CONTEXT,
  Select_2,
  SelectRow,
  newSet,
  cursorIndexFor,
  getTextContent,
};
