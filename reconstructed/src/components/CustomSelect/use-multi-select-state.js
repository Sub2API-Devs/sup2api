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
import { init_react_production, y, ce } from "../../../vendor/react/cjs/react.production.js";
import { useLatestState } from "./option-map.js";
import { useSelectNavigation } from "./use-select-navigation.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { normalizeFullWidthDigits_2, replaceIdeographicSpace } from "../../utils/stringUtils.js";

//@ chunk-nq7jz8ya.js:608-612 placement
init_react_production();
//@ chunk-nq7jz8ya.js:612-616 placement
init_react_production();
//@ chunk-nq7jz8ya.js:658-3281 fingerprint = useMultiSelectState (0.639)
function useMultiSelectState({
  isDisabled = false,
  visibleOptionCount = 5,
  options,
  defaultValue = [],
  onChange,
  onCancel,
  onFocus,
  submitButtonText,
  onSubmit,
  onDownFromLastItem,
  hideIndexes = false,
  refuseSubmitFocus,
}) {
  let [J, T, selectedValues] = useLatestState(defaultValue);
  let [N, V, z] = useLatestState(false);
  let [lastOptions, setLastOptions] = y(options);
  if (options !== lastOptions && !isDeepStrictEqual(options, lastOptions)) {
    T(defaultValue);
    setLastOptions(options);
  }
  let [D, Q] = y(() => {
    let initialMap = new Map();
    options.forEach((option) => {
      if (option.type === "input" && option.initialValue) initialMap.set(option.value, option.initialValue);
    });
    return initialMap;
  });
  let updateSelectedValues = ce(
    (values) => {
      let newValues = typeof values === "function" ? values(selectedValues()) : values;
      if (onChange?.(newValues) === false) return;
      T(newValues);
    },
    [selectedValues, T, onChange],
  );
  let C = ce(
    (t) => {
      if (options.find((option) => option.value === t)?.disabled === true) return;
      updateSelectedValues((a) => (a.includes(t) ? a.filter((v) => v !== t) : [...a, t]));
    },
    [options, updateSelectedValues],
  );
  let navigation = useSelectNavigation({
    visibleOptionCount,
    options,
    onFocus,
  });
  useRegisterOverlay("multi-select");
  let updateInputValue = ce(
    (value, inputValue) => {
      let found = options.find((opt) => opt.value === value);
      if (found?.type === "input" && found.onChange(inputValue) === false) return;
      Q((b) => {
        let next = new Map(b);
        next.set(value, inputValue);
        return next;
      });
      updateSelectedValues((prev) => {
        if (inputValue) {
          if (!prev.includes(value)) return [...prev, value];
          return prev;
        } else return prev.filter((v) => v !== value);
      });
    },
    [options, updateSelectedValues],
  );
  return {
    ...navigation,
    focusOption: (opt) => {
      V(false);
      navigation.focusOption(opt);
    },
    scrollViewport: (prev) => {
      let focusedValue = navigation.getFocusedValue();
      let f = navigation.scrollViewport(prev);
      if (navigation.getFocusedValue() !== focusedValue) V(false);
      return f;
    },
    selectedValues: J,
    getSelectedValues: selectedValues,
    inputValues: D,
    isSubmitFocused: N,
    updateInputValue,
    toggleValue: C,
    onCancel,
    handleKeyDown: (event) => {
      if (isDisabled) return;
      let normalizedInput = normalizeFullWidthDigits_2(event.key);
      let focusedValue = navigation.getFocusedValue();
      let F = options.find((opt) => opt.value === focusedValue)?.type === "input";
      let h = z();
      if (F) {
        if (!(
          event.key === "up" ||
          event.key === "down" ||
          event.key === "escape" ||
          event.key === "tab" ||
          event.key === "return" ||
          (event.ctrl && (event.key === "n" || event.key === "p" || event.key === "return"))
        ))
          return;
      }
      let lastOptionValue = options.at(-1)?.value;
      if (event.key === "tab" && !event.shift) {
        event.preventDefault();
        if (submitButtonText && onSubmit && focusedValue === lastOptionValue && !h) {
          if (refuseSubmitFocus?.()) return;
          V(true);
        } else if (!h) navigation.focusNextOption();
        return;
      }
      if (event.key === "tab" && event.shift) {
        event.preventDefault();
        if (submitButtonText && onSubmit && h) {
          V(false);
          navigation.focusOption(lastOptionValue);
        } else navigation.focusPreviousOption();
        return;
      }
      if (
        event.key === "down" ||
        (event.ctrl && event.key === "n") ||
        (!event.ctrl && !event.shift && event.key === "j")
      ) {
        event.preventDefault();
        if (h && onDownFromLastItem) onDownFromLastItem();
        else if (submitButtonText && onSubmit && focusedValue === lastOptionValue && !h) {
          if (refuseSubmitFocus?.()) return;
          V(true);
        } else if (!submitButtonText && onDownFromLastItem && focusedValue === lastOptionValue)
          onDownFromLastItem();
        else if (!h) navigation.focusNextOption();
        return;
      }
      if (
        event.key === "up" ||
        (event.ctrl && event.key === "p") ||
        (!event.ctrl && !event.shift && event.key === "k")
      ) {
        event.preventDefault();
        if (submitButtonText && onSubmit && h) {
          V(false);
          navigation.focusOption(lastOptionValue);
        } else navigation.focusPreviousOption();
        return;
      }
      if (event.key === "pagedown") {
        event.preventDefault();
        navigation.focusNextPage();
        return;
      }
      if (event.key === "pageup") {
        event.preventDefault();
        navigation.focusPreviousPage();
        return;
      }
      if (event.key === "return" || replaceIdeographicSpace(event.key) === " ") {
        event.preventDefault();
        if (event.ctrl && event.key === "return" && F && onSubmit) {
          onSubmit(selectedValues());
          return;
        }
        if (event.key === "return" && h && onSubmit) {
          onSubmit(selectedValues());
          return;
        }
        if (event.key === "return" && !submitButtonText && onSubmit) {
          onSubmit(selectedValues());
          return;
        }
        if (!h && focusedValue !== undefined) C(focusedValue);
        return;
      }
      if (!hideIndexes && /^[0-9]$/.test(normalizedInput)) {
        event.preventDefault();
        let index = parseInt(normalizedInput) - 1;
        if (index >= 0 && index < options.length) C(options[index].value);
        return;
      }
      if (event.key === "escape") {
        onCancel();
        event.stopImmediatePropagation();
      }
    },
  };
}
export { useMultiSelectState };
