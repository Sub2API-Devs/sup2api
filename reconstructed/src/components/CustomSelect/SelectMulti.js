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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { R, y } from "../../../vendor/react/cjs/react.production.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SelectInputOption } from "./select-input-option.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { SelectOption } from "./select-option.js";

//@ chunk-nq7jz8ya.js:3281-3319 placement
function optionDescription(St) {
  return St.description;
}
//@ chunk-nq7jz8ya.js:3319-3334 placement
function noop() {}
//@ chunk-nq7jz8ya.js:3334-4044 placement
function SelectMultiAccessible(o) {
  let d = w(12);
  if (useIsScreenReaderEnabled()) {
    let u;
    if (
      d[0] !== o.defaultValue ||
      d[1] !== o.isDisabled ||
      d[2] !== o.onCancel ||
      d[3] !== o.onChange ||
      d[4] !== o.onFocus ||
      d[5] !== o.onSubmit ||
      d[6] !== o.options ||
      d[7] !== o.refuseInput ||
      d[8] !== o.submitButtonText
    ) {
      u = jsxProd_default(MultiSelect, {
        options: o.options,
        defaultValue: o.defaultValue,
        onChange: o.onChange,
        onSubmit: o.onSubmit,
        onFocus: o.onFocus,
        onCancel: o.onCancel,
        isDisabled: o.isDisabled,
        submitButtonText: o.submitButtonText,
        refuseInput: o.refuseInput,
      });
      d[0] = o.defaultValue;
      d[1] = o.isDisabled;
      d[2] = o.onCancel;
      d[3] = o.onChange;
      d[4] = o.onFocus;
      d[5] = o.onSubmit;
      d[6] = o.options;
      d[7] = o.refuseInput;
      d[8] = o.submitButtonText;
      d[9] = u;
    } else u = d[9];
    return u;
  }
  let u;
  if (d[10] !== o) {
    u = jsxProd_default(SelectMulti, {
      ...o,
    });
    d[10] = o;
    d[11] = u;
  } else u = d[11];
  return u;
}
//@ chunk-nq7jz8ya.js:4044-8883 fingerprint = SelectMulti (0.732)
/**
 * 多选：空格切换选中，回车提交选中集合，支持 compact 布局与可输入项。
 */
function SelectMulti(props) {
  let $ = w(75);
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
  let i = isDisabled === undefined ? false : isDisabled;
  let he = visibleOptionCount === undefined ? 5 : visibleOptionCount;
  let t5;
  if ($[0] !== defaultValue) {
    t5 = defaultValue === undefined ? [] : defaultValue;
    $[0] = defaultValue;
    $[1] = t5;
  } else t5 = $[1];
  let defaultValue_2 = t5;
  let C = hideIndexes === undefined ? false : hideIndexes;
  let any = options.some(optionDescription);
  const visibleOptionCount_2 = fitVisibleOptionCount(he, any ? "compact-vertical" : "compact");
  let ge;
  if (
    $[2] !== defaultValue_2 ||
    $[3] !== C ||
    $[4] !== i ||
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
    ge = {
      isDisabled: i,
      visibleOptionCount: visibleOptionCount_2,
      options,
      defaultValue: defaultValue_2,
      onChange,
      onCancel,
      onFocus,
      submitButtonText,
      onSubmit,
      onDownFromLastItem,
      hideIndexes: C,
      refuseSubmitFocus,
    };
    $[2] = defaultValue_2;
    $[3] = C;
    $[4] = i;
    $[5] = onCancel;
    $[6] = onChange;
    $[7] = onDownFromLastItem;
    $[8] = onFocus;
    $[9] = onSubmit;
    $[10] = options;
    $[11] = refuseSubmitFocus;
    $[12] = submitButtonText;
    $[13] = visibleOptionCount_2;
    $[14] = ge;
  } else ge = $[14];
  let state = useMultiSelectState(ge);
  const focusedValue = state.isSubmitFocused ? undefined : state.focusedValue;
  let f;
  if ($[15] !== canPasteImage || $[16] !== options || $[17] !== state.focusOption || $[18] !== focusedValue) {
    f = {
      options,
      focusedValue,
      focusOption: state.focusOption,
      canPaste: canPasteImage,
    };
    $[15] = canPasteImage;
    $[16] = options;
    $[17] = state.focusOption;
    $[18] = focusedValue;
    $[19] = f;
  } else f = $[19];
  let onPaste = usePasteIntoInputOption(f);
  let F = R(null);
  useFocusOnMount(F, !i);
  let [h, E] = y(false);
  let O = userMessageBackgroundMode();
  let inverse = !i && h && O === "inverse";
  let strayClickGuard = useStrayClickGuard();
  let shouldDropWheel = useIsWithinStrayWindow();
  let Ke;
  if (
    $[20] !== i ||
    $[21] !== options.length ||
    $[22] !== shouldDropWheel ||
    $[23] !== state.scrollViewport ||
    $[24] !== state.visibleFromIndex ||
    $[25] !== state.visibleToIndex
  ) {
    Ke = {
      isDisabled: i,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel,
    };
    $[20] = i;
    $[21] = options.length;
    $[22] = shouldDropWheel;
    $[23] = state.scrollViewport;
    $[24] = state.visibleFromIndex;
    $[25] = state.visibleToIndex;
    $[26] = Ke;
  } else Ke = $[26];
  let selectWheel = useSelectWheel(Ke);
  let Be;
  if ($[27] !== i || $[28] !== strayClickGuard || $[29] !== state) {
    Be = (Z) =>
      i || Z.disabled === true
        ? undefined
        : (gt) => {
            if (strayClickGuard(gt)) {
              return;
            }
            if (Z.type === "input") state.focusOption(Z.value);
            else state.toggleValue(Z.value);
          };
    $[27] = i;
    $[28] = strayClickGuard;
    $[29] = state;
    $[30] = Be;
  } else Be = $[30];
  let ee = Be;
  let te;
  let oe;
  let ie;
  let children;
  let flexDirection;
  let ref;
  let _;
  if (
    $[31] !== canPasteImage ||
    $[32] !== ee ||
    $[33] !== onPaste ||
    $[34] !== C ||
    $[35] !== i ||
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
    oe = Box;
    flexDirection = "column";
    ref = F;
    if ($[51] !== onPaste || $[52] !== i || $[53] !== state.handleKeyDown) {
      _ = i
        ? {}
        : {
            tabIndex: 0,
            onKeyDown: state.handleKeyDown,
            onPaste,
          };
      $[51] = onPaste;
      $[52] = i;
      $[53] = state.handleKeyDown;
      $[54] = _;
    } else _ = $[54];
    te = WindowedText;
    ie = selectWheel;
    children = state.visibleOptions.map((option, index) => {
      let isOptionFocused = !i && state.focusedValue === option.value && !state.isSubmitFocused;
      let isSelected = state.selectedValues.includes(option.value);
      let isFirstVisibleOption = option.index === state.visibleFromIndex;
      let isLastVisibleOption = option.index === state.visibleToIndex - 1;
      let areMoreOptionsBelow = state.visibleToIndex < options.length;
      let areMoreOptionsAbove = state.visibleFromIndex > 0;
      let i_2 = state.visibleFromIndex + index + 1;
      if (option.type === "input") {
        let inputValue = state.inputValues.get(option.value) || "";
        return jsxProd_default(
          Box,
          {
            flexDirection: "column",
            children: jsxProd_default(SelectInputOption, {
              option,
              onClick: ee(option),
              isFocused: isOptionFocused,
              isSelected: false,
              shouldShowDownArrow: areMoreOptionsBelow && isLastVisibleOption,
              shouldShowUpArrow: areMoreOptionsAbove && isFirstVisibleOption,
              maxIndexWidth,
              index: i_2,
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
            onClick: ee(option),
            children: [
              !C &&
                jsxProd_default(Box, {
                  flexShrink: 0,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: `${i_2}.`.padEnd(maxIndexWidth),
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
    $[32] = ee;
    $[33] = onPaste;
    $[34] = C;
    $[35] = i;
    $[36] = onCancel;
    $[37] = onImagePaste;
    $[38] = onOpenEditor;
    $[39] = onRemoveImage;
    $[40] = options.length;
    $[41] = pastedContents;
    $[42] = selectWheel;
    $[43] = state;
    $[44] = te;
    $[45] = oe;
    $[46] = ie;
    $[47] = children;
    $[48] = flexDirection;
    $[49] = ref;
    $[50] = _;
  } else {
    te = $[44];
    oe = $[45];
    ie = $[46];
    children = $[47];
    flexDirection = $[48];
    ref = $[49];
    _ = $[50];
  }
  let ue;
  if ($[55] !== te || $[56] !== ie || $[57] !== children) {
    ue = jsxProd_default(te, {
      ...ie,
      children,
    });
    $[55] = te;
    $[56] = ie;
    $[57] = children;
    $[58] = ue;
  } else ue = $[58];
  let de;
  if (
    $[59] !== i ||
    $[60] !== onSubmit ||
    $[61] !== strayClickGuard ||
    $[62] !== state ||
    $[63] !== submitButtonText ||
    $[64] !== O ||
    $[65] !== h ||
    $[66] !== inverse
  ) {
    de =
      submitButtonText &&
      onSubmit &&
      jsxProd_default_2(Box, {
        marginTop: 0,
        gap: 1,
        onClick: i
          ? undefined
          : (Ot) => {
              if (strayClickGuard(Ot)) {
                return;
              }
              onSubmit(state.getSelectedValues());
            },
        backgroundColor: !i && h && O === "tint" ? USER_MESSAGE_BACKGROUND : undefined,
        onMouseEnter: () => E(true),
        onMouseLeave: () => E(false),
        children: [
          !i && state.isSubmitFocused
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
              color: !i && state.isSubmitFocused ? "suggestion" : undefined,
              bold: true,
              children: submitButtonText,
            }),
          }),
        ],
      });
    $[59] = i;
    $[60] = onSubmit;
    $[61] = strayClickGuard;
    $[62] = state;
    $[63] = submitButtonText;
    $[64] = O;
    $[65] = h;
    $[66] = inverse;
    $[67] = de;
  } else de = $[67];
  let t12;
  if (
    $[68] !== oe ||
    $[69] !== flexDirection ||
    $[70] !== ref ||
    $[71] !== _ ||
    $[72] !== ue ||
    $[73] !== de
  ) {
    t12 = jsxProd_default_2(oe, {
      flexDirection,
      ref,
      ..._,
      children: [ue, de],
    });
    $[68] = oe;
    $[69] = flexDirection;
    $[70] = ref;
    $[71] = _;
    $[72] = ue;
    $[73] = de;
    $[74] = t12;
  } else t12 = $[74];
  return t12;
}
export { SelectMultiAccessible };
