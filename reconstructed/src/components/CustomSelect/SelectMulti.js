/**
 * components/CustomSelect/SelectMulti.tsx
 *
 * 多选列表组件（复选、compact/compact-vertical 布局、可选输入项）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/SelectMulti.tsx
 * pieces: chunk-nq7jz8ya.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  MultiSelect,
  userMessageBackgroundMode,
  WindowedText,
  USER_MESSAGE_BACKGROUND,
} from "./selectTypeahead.js";
import { fitVisibleOptionCount, useSelectWheel } from "./select.js";
import { useMultiSelectState } from "./use-multi-select-state.js";
import { usePasteIntoInputOption } from "./use-select-input.js";
import { useRef, useState } from "../../../vendor/react/cjs/react.production.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SelectInputOption } from "./select-input-option.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { SelectOption } from "./select-option.js";

//@ chunk-nq7jz8ya.js:3281-3319 placement
function optionDescription(option) {
  return option.description;
}
//@ chunk-nq7jz8ya.js:3319-3334 placement
function noop() {}
//@ chunk-nq7jz8ya.js:3334-4044 placement
function SelectMultiAccessible(props) {
  let $ = useMemoCache(12);
  if (useIsScreenReaderEnabled()) {
    let multiSelectElement;
    if (
      $[0] !== props.defaultValue ||
      $[1] !== props.isDisabled ||
      $[2] !== props.onCancel ||
      $[3] !== props.onChange ||
      $[4] !== props.onFocus ||
      $[5] !== props.onSubmit ||
      $[6] !== props.options ||
      $[7] !== props.refuseInput ||
      $[8] !== props.submitButtonText
    ) {
      multiSelectElement = jsxProd_default(MultiSelect, {
        options: props.options,
        defaultValue: props.defaultValue,
        onChange: props.onChange,
        onSubmit: props.onSubmit,
        onFocus: props.onFocus,
        onCancel: props.onCancel,
        isDisabled: props.isDisabled,
        submitButtonText: props.submitButtonText,
        refuseInput: props.refuseInput,
      });
      $[0] = props.defaultValue;
      $[1] = props.isDisabled;
      $[2] = props.onCancel;
      $[3] = props.onChange;
      $[4] = props.onFocus;
      $[5] = props.onSubmit;
      $[6] = props.options;
      $[7] = props.refuseInput;
      $[8] = props.submitButtonText;
      $[9] = multiSelectElement;
    } else multiSelectElement = $[9];
    return multiSelectElement;
  }
  let selectMultiElement;
  if ($[10] !== props) {
    selectMultiElement = jsxProd_default(SelectMulti, {
      ...props,
    });
    $[10] = props;
    $[11] = selectMultiElement;
  } else selectMultiElement = $[11];
  return selectMultiElement;
}
//@ chunk-nq7jz8ya.js:4044-8883 fingerprint = SelectMulti (0.732)
/**
 * 多选：空格切换选中，回车提交选中集合，支持 compact 布局与可输入项。
 */
function SelectMulti(props) {
  let $ = useMemoCache(75);
  let {
    isDisabled,
    visibleOptionCount,
    options,
    defaultValue,
    onCancel,
    onChange,
    onFocus,
    submitButtonText,
    onSubmit,
    onDownFromLastItem,
    onOpenEditor,
    hideIndexes,
    canPasteImage,
    onImagePaste,
    pastedContents,
    onRemoveImage,
    refuseSubmitFocus,
  } = props;
  let isDisabledFlag = isDisabled === undefined ? false : isDisabled;
  let visibleCountProp = visibleOptionCount === undefined ? 5 : visibleOptionCount;
  let t5;
  if ($[0] !== defaultValue) {
    t5 = defaultValue === undefined ? [] : defaultValue;
    $[0] = defaultValue;
    $[1] = t5;
  } else t5 = $[1];
  let defaultValue_2 = t5;
  let hideIndexesFlag = hideIndexes === undefined ? false : hideIndexes;
  let any = options.some(optionDescription);
  const visibleOptionCount_2 = fitVisibleOptionCount(visibleCountProp, any ? "compact-vertical" : "compact");
  let stateOptions;
  if (
    $[2] !== defaultValue_2 ||
    $[3] !== hideIndexesFlag ||
    $[4] !== isDisabledFlag ||
    $[5] !== onCancel ||
    $[6] !== onChange ||
    $[7] !== onDownFromLastItem ||
    $[8] !== onFocus ||
    $[9] !== onSubmit ||
    $[10] !== options ||
    $[11] !== refuseSubmitFocus ||
    $[12] !== submitButtonText ||
    $[13] !== visibleOptionCount_2
  ) {
    stateOptions = {
      isDisabled: isDisabledFlag,
      visibleOptionCount: visibleOptionCount_2,
      options,
      defaultValue: defaultValue_2,
      onChange,
      onCancel,
      onFocus,
      submitButtonText,
      onSubmit,
      onDownFromLastItem,
      hideIndexes: hideIndexesFlag,
      refuseSubmitFocus,
    };
    $[2] = defaultValue_2;
    $[3] = hideIndexesFlag;
    $[4] = isDisabledFlag;
    $[5] = onCancel;
    $[6] = onChange;
    $[7] = onDownFromLastItem;
    $[8] = onFocus;
    $[9] = onSubmit;
    $[10] = options;
    $[11] = refuseSubmitFocus;
    $[12] = submitButtonText;
    $[13] = visibleOptionCount_2;
    $[14] = stateOptions;
  } else stateOptions = $[14];
  let state = useMultiSelectState(stateOptions);
  const focusedValue = state.isSubmitFocused ? undefined : state.focusedValue;
  let pasteOptions;
  if ($[15] !== canPasteImage || $[16] !== options || $[17] !== state.focusOption || $[18] !== focusedValue) {
    pasteOptions = {
      options,
      focusedValue,
      focusOption: state.focusOption,
      canPaste: canPasteImage,
    };
    $[15] = canPasteImage;
    $[16] = options;
    $[17] = state.focusOption;
    $[18] = focusedValue;
    $[19] = pasteOptions;
  } else pasteOptions = $[19];
  let onPaste = usePasteIntoInputOption(pasteOptions);
  let containerRef = useRef(null);
  useFocusOnMount(containerRef, !isDisabledFlag);
  let [isHovered, setIsHovered] = useState(false);
  let backgroundMode = userMessageBackgroundMode();
  let inverse = !isDisabledFlag && isHovered && backgroundMode === "inverse";
  let strayClickGuard = useStrayClickGuard();
  let shouldDropWheel = useIsWithinStrayWindow();
  let wheelOptions;
  if (
    $[20] !== isDisabledFlag ||
    $[21] !== options.length ||
    $[22] !== shouldDropWheel ||
    $[23] !== state.scrollViewport ||
    $[24] !== state.visibleFromIndex ||
    $[25] !== state.visibleToIndex
  ) {
    wheelOptions = {
      isDisabled: isDisabledFlag,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel,
    };
    $[20] = isDisabledFlag;
    $[21] = options.length;
    $[22] = shouldDropWheel;
    $[23] = state.scrollViewport;
    $[24] = state.visibleFromIndex;
    $[25] = state.visibleToIndex;
    $[26] = wheelOptions;
  } else wheelOptions = $[26];
  let selectWheel = useSelectWheel(wheelOptions);
  let clickHandlerCached;
  if ($[27] !== isDisabledFlag || $[28] !== strayClickGuard || $[29] !== state) {
    clickHandlerCached = (option) =>
      isDisabledFlag || option.disabled === true
        ? undefined
        : (event) => {
            if (strayClickGuard(event)) {
              return;
            }
            if (option.type === "input") state.focusOption(option.value);
            else state.toggleValue(option.value);
          };
    $[27] = isDisabledFlag;
    $[28] = strayClickGuard;
    $[29] = state;
    $[30] = clickHandlerCached;
  } else clickHandlerCached = $[30];
  let makeClickHandler = clickHandlerCached;
  let WindowedTextComponent;
  let BoxComponent;
  let wheelProps;
  let children;
  let flexDirection;
  let ref;
  let containerProps;
  if (
    $[31] !== canPasteImage ||
    $[32] !== makeClickHandler ||
    $[33] !== onPaste ||
    $[34] !== hideIndexesFlag ||
    $[35] !== isDisabledFlag ||
    $[36] !== onCancel ||
    $[37] !== onImagePaste ||
    $[38] !== onOpenEditor ||
    $[39] !== onRemoveImage ||
    $[40] !== options.length ||
    $[41] !== pastedContents ||
    $[42] !== selectWheel ||
    $[43] !== state
  ) {
    let maxIndexWidth = options.length.toString().length;
    BoxComponent = Box;
    flexDirection = "column";
    ref = containerRef;
    if ($[51] !== onPaste || $[52] !== isDisabledFlag || $[53] !== state.handleKeyDown) {
      containerProps = isDisabledFlag
        ? {}
        : {
            tabIndex: 0,
            onKeyDown: state.handleKeyDown,
            onPaste,
          };
      $[51] = onPaste;
      $[52] = isDisabledFlag;
      $[53] = state.handleKeyDown;
      $[54] = containerProps;
    } else containerProps = $[54];
    WindowedTextComponent = WindowedText;
    wheelProps = selectWheel;
    children = state.visibleOptions.map((option, index) => {
      let isOptionFocused = !isDisabledFlag && state.focusedValue === option.value && !state.isSubmitFocused;
      let isSelected = state.selectedValues.includes(option.value);
      let isFirstVisibleOption = option.index === state.visibleFromIndex;
      let isLastVisibleOption = option.index === state.visibleToIndex - 1;
      let areMoreOptionsBelow = state.visibleToIndex < options.length;
      let areMoreOptionsAbove = state.visibleFromIndex > 0;
      let i = state.visibleFromIndex + index + 1;
      if (option.type === "input") {
        let inputValue = state.inputValues.get(option.value) || "";
        return jsxProd_default(
          Box,
          {
            flexDirection: "column",
            children: jsxProd_default(SelectInputOption, {
              option,
              onClick: makeClickHandler(option),
              isFocused: isOptionFocused,
              isSelected: false,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i,
              inputValue,
              onInputChange: (value) => {
                state.updateInputValue(option.value, value);
              },
              onSubmit: noop,
              onExit: () => {
                onCancel();
              },
              layout: "compact",
              onOpenEditor,
              canPasteImage,
              onImagePaste,
              pastedContents,
              onRemoveImage,
              extraChromeWidth: 4,
              children: jsxProd_default_2(Text, {
                color: isSelected ? "success" : undefined,
                children: ["[", isSelected ? figures_default.tick : " ", "]", " "],
              }),
            }),
          },
          String(option.value),
        );
      }
      return jsxProd_default(
        Box,
        {
          flexDirection: "column",
          children: jsxProd_default_2(SelectOption, {
            isFocused: isOptionFocused,
            isSelected: false,
            shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
            shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
            onClick: makeClickHandler(option),
            children: [
              !hideIndexesFlag &&
                jsxProd_default(Box, {
                  flexShrink: 0,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: `${i}.`.padEnd(maxIndexWidth),
                  }),
                }),
              jsxProd_default(Box, {
                flexShrink: 0,
                children: jsxProd_default_2(Text, {
                  color: isSelected ? "success" : undefined,
                  children: ["[", isSelected ? figures_default.tick : " ", "]"],
                }),
              }),
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Text, {
                    color: isOptionFocused ? "suggestion" : undefined,
                    children: option.label,
                  }),
                  option.description &&
                    jsxProd_default(Text, {
                      color: "inactive",
                      children: option.description,
                    }),
                ],
              }),
            ],
          }),
        },
        String(option.value),
      );
    });
    $[31] = canPasteImage;
    $[32] = makeClickHandler;
    $[33] = onPaste;
    $[34] = hideIndexesFlag;
    $[35] = isDisabledFlag;
    $[36] = onCancel;
    $[37] = onImagePaste;
    $[38] = onOpenEditor;
    $[39] = onRemoveImage;
    $[40] = options.length;
    $[41] = pastedContents;
    $[42] = selectWheel;
    $[43] = state;
    $[44] = WindowedTextComponent;
    $[45] = BoxComponent;
    $[46] = wheelProps;
    $[47] = children;
    $[48] = flexDirection;
    $[49] = ref;
    $[50] = containerProps;
  } else {
    WindowedTextComponent = $[44];
    BoxComponent = $[45];
    wheelProps = $[46];
    children = $[47];
    flexDirection = $[48];
    ref = $[49];
    containerProps = $[50];
  }
  let windowedElement;
  if ($[55] !== WindowedTextComponent || $[56] !== wheelProps || $[57] !== children) {
    windowedElement = jsxProd_default(WindowedTextComponent, {
      ...wheelProps,
      children,
    });
    $[55] = WindowedTextComponent;
    $[56] = wheelProps;
    $[57] = children;
    $[58] = windowedElement;
  } else windowedElement = $[58];
  let submitElement;
  if (
    $[59] !== isDisabledFlag ||
    $[60] !== onSubmit ||
    $[61] !== strayClickGuard ||
    $[62] !== state ||
    $[63] !== submitButtonText ||
    $[64] !== backgroundMode ||
    $[65] !== isHovered ||
    $[66] !== inverse
  ) {
    submitElement =
      submitButtonText &&
      onSubmit &&
      jsxProd_default_2(Box, {
        marginTop: 0,
        gap: 1,
        onClick: isDisabledFlag
          ? undefined
          : (event) => {
              if (strayClickGuard(event)) {
                return;
              }
              onSubmit(state.getSelectedValues());
            },
        backgroundColor:
          !isDisabledFlag && isHovered && backgroundMode === "tint" ? USER_MESSAGE_BACKGROUND : undefined,
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
        children: [
          !isDisabledFlag && state.isSubmitFocused
            ? jsxProd_default(Text, {
                color: "suggestion",
                inverse,
                children: figures_default.pointer,
              })
            : jsxProd_default(Text, {
                inverse,
                children: " ",
              }),
          jsxProd_default(Box, {
            marginLeft: 3,
            children: jsxProd_default(Text, {
              color: !isDisabledFlag && state.isSubmitFocused ? "suggestion" : undefined,
              bold: true,
              children: submitButtonText,
            }),
          }),
        ],
      });
    $[59] = isDisabledFlag;
    $[60] = onSubmit;
    $[61] = strayClickGuard;
    $[62] = state;
    $[63] = submitButtonText;
    $[64] = backgroundMode;
    $[65] = isHovered;
    $[66] = inverse;
    $[67] = submitElement;
  } else submitElement = $[67];
  let t12;
  if (
    $[68] !== BoxComponent ||
    $[69] !== flexDirection ||
    $[70] !== ref ||
    $[71] !== containerProps ||
    $[72] !== windowedElement ||
    $[73] !== submitElement
  ) {
    t12 = jsxProd_default_2(BoxComponent, {
      flexDirection,
      ref,
      ...containerProps,
      children: [windowedElement, submitElement],
    });
    $[68] = BoxComponent;
    $[69] = flexDirection;
    $[70] = ref;
    $[71] = containerProps;
    $[72] = windowedElement;
    $[73] = submitElement;
    $[74] = t12;
  } else t12 = $[74];
  return t12;
}
export { SelectMultiAccessible };
