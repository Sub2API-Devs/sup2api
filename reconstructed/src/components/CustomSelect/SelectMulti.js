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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MultiSelect, WDe, WindowedText, USER_MESSAGE_BACKGROUND } from "./selectTypeahead.js";
import { fitVisibleOptionCount, useSelectWheel } from "./select.js";
import { useMultiSelectState } from "./use-multi-select-state.js";
import { usePasteIntoInputOption } from "./use-select-input.js";
import { R, y } from "../../../vendor/react/cjs/react.production.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useStrayClickGuard, useIsWithinStrayWindow } from "./strayClickGuard.js";
import { Box, Text } from "../../ink/components/Text.js";
import { SelectInputOption } from "./select-input-option.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
    )
      ((u = e(MultiSelect, {
        options: o.options,
        defaultValue: o.defaultValue,
        onChange: o.onChange,
        onSubmit: o.onSubmit,
        onFocus: o.onFocus,
        onCancel: o.onCancel,
        isDisabled: o.isDisabled,
        submitButtonText: o.submitButtonText,
        refuseInput: o.refuseInput,
      })),
        (d[0] = o.defaultValue),
        (d[1] = o.isDisabled),
        (d[2] = o.onCancel),
        (d[3] = o.onChange),
        (d[4] = o.onFocus),
        (d[5] = o.onSubmit),
        (d[6] = o.options),
        (d[7] = o.refuseInput),
        (d[8] = o.submitButtonText),
        (d[9] = u));
    else u = d[9];
    return u;
  }
  let u;
  if (d[10] !== o) ((u = e(SelectMulti, { ...o })), (d[10] = o), (d[11] = u));
  else u = d[11];
  return u;
}
/**
 * 多选：空格切换选中，回车提交选中集合，支持 compact 布局与可输入项。
 */
//@ chunk-nq7jz8ya.js:4044-8883 fingerprint = SelectMulti (0.732)
function SelectMulti(t0) {
  let $ = w(75),
    {
      isDisabled: t1,
      visibleOptionCount: t2,
      options: options,
      defaultValue: t3,
      onCancel: onCancel,
      onChange: onChange,
      onFocus: onFocus,
      submitButtonText: submitButtonText,
      onSubmit: onSubmit,
      onDownFromLastItem: onDownFromLastItem,
      onOpenEditor: onOpenEditor,
      hideIndexes: t4,
      canPasteImage: canPasteImage,
      onImagePaste: onImagePaste,
      pastedContents: pastedContents,
      onRemoveImage: onRemoveImage,
      refuseSubmitFocus: refuseSubmitFocus,
    } = t0,
    i = t1 === void 0 ? !1 : t1,
    he = t2 === void 0 ? 5 : t2,
    Q;
  if ($[0] !== t3) ((Q = t3 === void 0 ? [] : t3), ($[0] = t3), ($[1] = Q));
  else Q = $[1];
  let M = Q,
    C = t4 === void 0 ? !1 : t4,
    any = options.some(optionDescription);
  const U = fitVisibleOptionCount(he, any ? "compact-vertical" : "compact");
  let ge;
  if (
    $[2] !== M ||
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
    $[13] !== U
  )
    ((ge = {
      isDisabled: i,
      visibleOptionCount: U,
      options: options,
      defaultValue: M,
      onChange: onChange,
      onCancel: onCancel,
      onFocus: onFocus,
      submitButtonText: submitButtonText,
      onSubmit: onSubmit,
      onDownFromLastItem: onDownFromLastItem,
      hideIndexes: C,
      refuseSubmitFocus: refuseSubmitFocus,
    }),
      ($[2] = M),
      ($[3] = C),
      ($[4] = i),
      ($[5] = onCancel),
      ($[6] = onChange),
      ($[7] = onDownFromLastItem),
      ($[8] = onFocus),
      ($[9] = onSubmit),
      ($[10] = options),
      ($[11] = refuseSubmitFocus),
      ($[12] = submitButtonText),
      ($[13] = U),
      ($[14] = ge));
  else ge = $[14];
  let state = useMultiSelectState(ge);
  const a = state.isSubmitFocused ? void 0 : state.focusedValue;
  let f;
  if ($[15] !== canPasteImage || $[16] !== options || $[17] !== state.focusOption || $[18] !== a)
    ((f = { options: options, focusedValue: a, focusOption: state.focusOption, canPaste: canPasteImage }),
      ($[15] = canPasteImage),
      ($[16] = options),
      ($[17] = state.focusOption),
      ($[18] = a),
      ($[19] = f));
  else f = $[19];
  let b = usePasteIntoInputOption(f),
    F = R(null);
  useFocusOnMount(F, !i);
  let [h, E] = y(!1),
    O = WDe(),
    Y = !i && h && O === "inverse",
    K = useStrayClickGuard(),
    ye = useIsWithinStrayWindow(),
    Ke;
  if (
    $[20] !== i ||
    $[21] !== options.length ||
    $[22] !== ye ||
    $[23] !== state.scrollViewport ||
    $[24] !== state.visibleFromIndex ||
    $[25] !== state.visibleToIndex
  )
    ((Ke = {
      isDisabled: i,
      visibleFromIndex: state.visibleFromIndex,
      visibleToIndex: state.visibleToIndex,
      optionCount: options.length,
      scrollViewport: state.scrollViewport,
      shouldDropWheel: ye,
    }),
      ($[20] = i),
      ($[21] = options.length),
      ($[22] = ye),
      ($[23] = state.scrollViewport),
      ($[24] = state.visibleFromIndex),
      ($[25] = state.visibleToIndex),
      ($[26] = Ke));
  else Ke = $[26];
  let De = useSelectWheel(Ke),
    Be;
  if ($[27] !== i || $[28] !== K || $[29] !== state)
    ((Be = (Z) =>
      i || Z.disabled === !0
        ? void 0
        : (gt) => {
            if (K(gt)) {
              return;
            }
            if (Z.type === "input") state.focusOption(Z.value);
            else state.toggleValue(Z.value);
          }),
      ($[27] = i),
      ($[28] = K),
      ($[29] = state),
      ($[30] = Be));
  else Be = $[30];
  let ee = Be,
    te,
    oe,
    ie,
    ne,
    se,
    ae,
    _;
  if (
    $[31] !== canPasteImage ||
    $[32] !== ee ||
    $[33] !== b ||
    $[34] !== C ||
    $[35] !== i ||
    $[36] !== onCancel ||
    $[37] !== onImagePaste ||
    $[38] !== onOpenEditor ||
    $[39] !== onRemoveImage ||
    $[40] !== options.length ||
    $[41] !== pastedContents ||
    $[42] !== De ||
    $[43] !== state
  ) {
    let maxIndexWidth = options.length.toString().length;
    oe = Box;
    se = "column";
    ae = F;
    if ($[51] !== b || $[52] !== i || $[53] !== state.handleKeyDown)
      ((_ = i ? {} : { tabIndex: 0, onKeyDown: state.handleKeyDown, onPaste: b }),
        ($[51] = b),
        ($[52] = i),
        ($[53] = state.handleKeyDown),
        ($[54] = _));
    else _ = $[54];
    te = WindowedText;
    ie = De;
    ne = state.visibleOptions.map((option, index) => {
      let xe = !i && state.focusedValue === option.value && !state.isSubmitFocused;
      let isSelected = state.selectedValues.includes(option.value);
      let Ne = option.index === state.visibleFromIndex;
      let je = option.index === state.visibleToIndex - 1;
      let ze = state.visibleToIndex < options.length;
      let Ue = state.visibleFromIndex > 0;
      let _e = state.visibleFromIndex + index + 1;
      if (option.type === "input") {
        let Dt = state.inputValues.get(option.value) || "";
        return e(
          Box,
          {
            flexDirection: "column",
            children: e(SelectInputOption, {
              option: option,
              onClick: ee(option),
              isFocused: xe,
              isSelected: !1,
              shouldShowDownArrow: ze && je,
              shouldShowUpArrow: Ue && Ne,
              maxIndexWidth: maxIndexWidth,
              index: _e,
              inputValue: Dt,
              onInputChange: (value) => {
                state.updateInputValue(option.value, value);
              },
              onSubmit: noop,
              onExit: () => {
                onCancel();
              },
              layout: "compact",
              onOpenEditor: onOpenEditor,
              canPasteImage: canPasteImage,
              onImagePaste: onImagePaste,
              pastedContents: pastedContents,
              onRemoveImage: onRemoveImage,
              extraChromeWidth: 4,
              children: r(Text, {
                color: isSelected ? "success" : void 0,
                children: ["[", isSelected ? re.tick : " ", "]", " "],
              }),
            }),
          },
          String(option.value),
        );
      }
      return e(
        Box,
        {
          flexDirection: "column",
          children: r(SelectOption, {
            isFocused: xe,
            isSelected: !1,
            shouldShowDownArrow: ze && je,
            shouldShowUpArrow: Ue && Ne,
            onClick: ee(option),
            children: [
              !C &&
                e(Box, {
                  flexShrink: 0,
                  children: e(Text, { dimColor: !0, children: `${_e}.`.padEnd(maxIndexWidth) }),
                }),
              e(Box, {
                flexShrink: 0,
                children: r(Text, {
                  color: isSelected ? "success" : void 0,
                  children: ["[", isSelected ? re.tick : " ", "]"],
                }),
              }),
              r(Box, {
                flexDirection: "column",
                children: [
                  e(Text, { color: xe ? "suggestion" : void 0, children: option.label }),
                  option.description && e(Text, { color: "inactive", children: option.description }),
                ],
              }),
            ],
          }),
        },
        String(option.value),
      );
    });
    (($[31] = canPasteImage),
      ($[32] = ee),
      ($[33] = b),
      ($[34] = C),
      ($[35] = i),
      ($[36] = onCancel),
      ($[37] = onImagePaste),
      ($[38] = onOpenEditor),
      ($[39] = onRemoveImage),
      ($[40] = options.length),
      ($[41] = pastedContents),
      ($[42] = De),
      ($[43] = state),
      ($[44] = te),
      ($[45] = oe),
      ($[46] = ie),
      ($[47] = ne),
      ($[48] = se),
      ($[49] = ae),
      ($[50] = _));
  } else ((te = $[44]), (oe = $[45]), (ie = $[46]), (ne = $[47]), (se = $[48]), (ae = $[49]), (_ = $[50]));
  let ue;
  if ($[55] !== te || $[56] !== ie || $[57] !== ne)
    ((ue = e(te, { ...ie, children: ne })), ($[55] = te), ($[56] = ie), ($[57] = ne), ($[58] = ue));
  else ue = $[58];
  let de;
  if (
    $[59] !== i ||
    $[60] !== onSubmit ||
    $[61] !== K ||
    $[62] !== state ||
    $[63] !== submitButtonText ||
    $[64] !== O ||
    $[65] !== h ||
    $[66] !== Y
  )
    ((de =
      submitButtonText &&
      onSubmit &&
      r(Box, {
        marginTop: 0,
        gap: 1,
        onClick: i
          ? void 0
          : (Ot) => {
              if (K(Ot)) {
                return;
              }
              onSubmit(state.getSelectedValues());
            },
        backgroundColor: !i && h && O === "tint" ? USER_MESSAGE_BACKGROUND : void 0,
        onMouseEnter: () => E(!0),
        onMouseLeave: () => E(!1),
        children: [
          !i && state.isSubmitFocused
            ? e(Text, { color: "suggestion", inverse: Y, children: re.pointer })
            : e(Text, { inverse: Y, children: " " }),
          e(Box, {
            marginLeft: 3,
            children: e(Text, {
              color: !i && state.isSubmitFocused ? "suggestion" : void 0,
              bold: !0,
              children: submitButtonText,
            }),
          }),
        ],
      })),
      ($[59] = i),
      ($[60] = onSubmit),
      ($[61] = K),
      ($[62] = state),
      ($[63] = submitButtonText),
      ($[64] = O),
      ($[65] = h),
      ($[66] = Y),
      ($[67] = de));
  else de = $[67];
  let $e;
  if ($[68] !== oe || $[69] !== se || $[70] !== ae || $[71] !== _ || $[72] !== ue || $[73] !== de)
    (($e = r(oe, { flexDirection: se, ref: ae, ..._, children: [ue, de] })),
      ($[68] = oe),
      ($[69] = se),
      ($[70] = ae),
      ($[71] = _),
      ($[72] = ue),
      ($[73] = de),
      ($[74] = $e));
  else $e = $[74];
  return $e;
}

export { SelectMultiAccessible };
