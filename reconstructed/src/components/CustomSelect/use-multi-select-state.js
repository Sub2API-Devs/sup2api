/**
 * components/CustomSelect/use-multi-select-state.ts
 *
 * 多选状态 hook（选中集合、提交、Esc 取消）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-multi-select-state.ts
 * pieces: chunk-nq7jz8ya.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { isDeepStrictEqual } from "util";
import { j, y, ce } from "../../../vendor/react/cjs/react.production.js";
import { useLatestState } from "./option-map.js";
import { useSelectNavigation } from "./use-select-navigation.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { normalizeFullWidthDigits_2, replaceIdeographicSpace } from "../../utils/stringUtils.js";

//@ chunk-nq7jz8ya.js:608-612 placement
j();
//@ chunk-nq7jz8ya.js:612-616 placement
j();
//@ chunk-nq7jz8ya.js:658-3281 fingerprint = useMultiSelectState (0.639)
function useMultiSelectState({
  isDisabled: isDisabled = !1,
  visibleOptionCount: visibleOptionCount = 5,
  options: options,
  defaultValue: defaultValue = [],
  onChange: onChange,
  onCancel: onCancel,
  onFocus: onFocus,
  submitButtonText: submitButtonText,
  onSubmit: onSubmit,
  onDownFromLastItem: onDownFromLastItem,
  hideIndexes: hideIndexes = !1,
  refuseSubmitFocus: refuseSubmitFocus,
}) {
  let [J, T, k] = useLatestState(defaultValue),
    [N, V, z] = useLatestState(!1),
    [i, he] = y(options);
  if (options !== i && !isDeepStrictEqual(options, i)) (T(defaultValue), he(options));
  let [D, Q] = y(() => {
      let initialMap = new Map();
      return (
        options.forEach((option) => {
          if (option.type === "input" && option.initialValue)
            initialMap.set(option.value, option.initialValue);
        }),
        initialMap
      );
    }),
    updateSelectedValues = ce(
      (values) => {
        let a = typeof values === "function" ? values(k()) : values;
        if (onChange?.(a) === !1) return;
        T(a);
      },
      [k, T, onChange],
    ),
    C = ce(
      (t) => {
        if (options.find((a) => a.value === t)?.disabled === !0) return;
        updateSelectedValues((a) => (a.includes(t) ? a.filter((f) => f !== t) : [...a, t]));
      },
      [options, updateSelectedValues],
    ),
    navigation = useSelectNavigation({
      visibleOptionCount: visibleOptionCount,
      options: options,
      onFocus: onFocus,
    });
  useRegisterOverlay("multi-select");
  let updateInputValue = ce(
    (value, inputValue) => {
      let found = options.find((prev) => prev.value === value);
      if (found?.type === "input" && found.onChange(inputValue) === !1) return;
      (Q((b) => {
        let next = new Map(b);
        return (next.set(value, inputValue), next);
      }),
        updateSelectedValues((b) => {
          if (inputValue) {
            if (!b.includes(value)) return [...b, value];
            return b;
          } else return b.filter((F) => F !== value);
        }));
    },
    [options, updateSelectedValues],
  );
  return {
    ...navigation,
    focusOption: (opt) => {
      (V(!1), navigation.focusOption(opt));
    },
    scrollViewport: (prev) => {
      let focusedValue = navigation.getFocusedValue(),
        scrollViewport = navigation.scrollViewport(prev);
      if (navigation.getFocusedValue() !== focusedValue) V(!1);
      return scrollViewport;
    },
    selectedValues: J,
    getSelectedValues: k,
    inputValues: D,
    isSubmitFocused: N,
    updateInputValue: updateInputValue,
    toggleValue: C,
    onCancel: onCancel,
    handleKeyDown: (t) => {
      if (isDisabled) return;
      let normalizedInput = normalizeFullWidthDigits_2(t.key),
        focusedValue = navigation.getFocusedValue(),
        F = options.find((opt) => opt.value === focusedValue)?.type === "input",
        h = z();
      if (F) {
        if (!(
          t.key === "up" ||
          t.key === "down" ||
          t.key === "escape" ||
          t.key === "tab" ||
          t.key === "return" ||
          (t.ctrl && (t.key === "n" || t.key === "p" || t.key === "return"))
        ))
          return;
      }
      let lastOptionValue = options.at(-1)?.value;
      if (t.key === "tab" && !t.shift) {
        if ((t.preventDefault(), submitButtonText && onSubmit && focusedValue === lastOptionValue && !h)) {
          if (refuseSubmitFocus?.()) return;
          V(!0);
        } else if (!h) navigation.focusNextOption();
        return;
      }
      if (t.key === "tab" && t.shift) {
        if ((t.preventDefault(), submitButtonText && onSubmit && h))
          (V(!1), navigation.focusOption(lastOptionValue));
        else navigation.focusPreviousOption();
        return;
      }
      if (t.key === "down" || (t.ctrl && t.key === "n") || (!t.ctrl && !t.shift && t.key === "j")) {
        if ((t.preventDefault(), h && onDownFromLastItem)) onDownFromLastItem();
        else if (submitButtonText && onSubmit && focusedValue === lastOptionValue && !h) {
          if (refuseSubmitFocus?.()) return;
          V(!0);
        } else if (!submitButtonText && onDownFromLastItem && focusedValue === lastOptionValue)
          onDownFromLastItem();
        else if (!h) navigation.focusNextOption();
        return;
      }
      if (t.key === "up" || (t.ctrl && t.key === "p") || (!t.ctrl && !t.shift && t.key === "k")) {
        if ((t.preventDefault(), submitButtonText && onSubmit && h))
          (V(!1), navigation.focusOption(lastOptionValue));
        else navigation.focusPreviousOption();
        return;
      }
      if (t.key === "pagedown") {
        (t.preventDefault(), navigation.focusNextPage());
        return;
      }
      if (t.key === "pageup") {
        (t.preventDefault(), navigation.focusPreviousPage());
        return;
      }
      if (t.key === "return" || replaceIdeographicSpace(t.key) === " ") {
        if ((t.preventDefault(), t.ctrl && t.key === "return" && F && onSubmit)) {
          onSubmit(k());
          return;
        }
        if (t.key === "return" && h && onSubmit) {
          onSubmit(k());
          return;
        }
        if (t.key === "return" && !submitButtonText && onSubmit) {
          onSubmit(k());
          return;
        }
        if (!h && focusedValue !== void 0) C(focusedValue);
        return;
      }
      if (!hideIndexes && /^[0-9]$/.test(normalizedInput)) {
        t.preventDefault();
        let O = parseInt(normalizedInput) - 1;
        if (O >= 0 && O < options.length) C(options[O].value);
        return;
      }
      if (t.key === "escape") (onCancel(), t.stopImmediatePropagation());
    },
  };
}

export { useMultiSelectState };
