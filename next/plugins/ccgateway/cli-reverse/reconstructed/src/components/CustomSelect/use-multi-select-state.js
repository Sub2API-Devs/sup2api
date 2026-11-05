/**
 * components/CustomSelect/use-multi-select-state.ts
 *
 * 多选状态 hook（选中集合、提交、Esc 取消）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-multi-select-state.ts
 * pieces: chunk-jqr4ms5p.js (3)
 * attribution: placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { init_react_production, useState, useCallback } from "../../../vendor/react/cjs/react.production.js";
import { useLatestState } from "./option-map.js";
import { useSelectNavigation } from "./use-select-navigation.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { normalizeFullWidthDigits_2, replaceIdeographicSpace } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jqr4ms5p.js:609-613 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jqr4ms5p.js:609", () => {
  init_react_production();
});
//@ chunk-jqr4ms5p.js:613-617 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jqr4ms5p.js:613", () => {
  init_react_production();
});
//@ chunk-jqr4ms5p.js:659-3283 fingerprint (2.1.88 match: useMultiSelectState, 0.638)
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
  let [selectedValues, setSelectedValues, selectedValues_2] = useLatestState(defaultValue);
  let [isSubmitFocused, setIsSubmitFocused, getIsSubmitFocused] = useLatestState(false);
  let [lastOptions, setLastOptions] = useState(options);
  if (options !== lastOptions && !isDeepStrictEqual(options, lastOptions)) {
    setSelectedValues(defaultValue);
    setLastOptions(options);
  }
  let [inputValues, setInputValues] = useState(() => {
    let initialMap = new Map();
    options.forEach((option) => {
      if (option.type === "input" && option.initialValue) initialMap.set(option.value, option.initialValue);
    });
    return initialMap;
  });
  let updateSelectedValues = useCallback(
    (values) => {
      let newValues = typeof values === "function" ? values(selectedValues_2()) : values;
      if (onChange?.(newValues) === false) return;
      setSelectedValues(newValues);
    },
    [selectedValues_2, setSelectedValues, onChange],
  );
  let toggleValue = useCallback(
    (value) => {
      if (options.find((option) => option.value === value)?.disabled === true) return;
      updateSelectedValues((previous) =>
        previous.includes(value) ? previous.filter((v) => v !== value) : [...previous, value],
      );
    },
    [options, updateSelectedValues],
  );
  let navigation = useSelectNavigation({
    visibleOptionCount,
    options,
    onFocus,
  });
  useRegisterOverlay("multi-select");
  let updateInputValue = useCallback(
    (value, inputValue) => {
      let found = options.find((opt) => opt.value === value);
      if (found?.type === "input" && found.onChange(inputValue) === false) return;
      setInputValues((previous) => {
        let next = new Map(previous);
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
      setIsSubmitFocused(false);
      navigation.focusOption(opt);
    },
    scrollViewport: (prev) => {
      let focusedValue = navigation.getFocusedValue();
      let scrolled = navigation.scrollViewport(prev);
      if (navigation.getFocusedValue() !== focusedValue) setIsSubmitFocused(false);
      return scrolled;
    },
    selectedValues,
    getSelectedValues: selectedValues_2,
    inputValues,
    isSubmitFocused,
    updateInputValue,
    toggleValue,
    onCancel,
    handleKeyDown: (event) => {
      if (isDisabled) return;
      let normalizedInput = normalizeFullWidthDigits_2(event.key);
      let focusedValue = navigation.getFocusedValue();
      let isInputOption = options.find((opt) => opt.value === focusedValue)?.type === "input";
      let submitFocused = getIsSubmitFocused();
      if (isInputOption) {
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
        if (submitButtonText && onSubmit && focusedValue === lastOptionValue && !submitFocused) {
          if (refuseSubmitFocus?.()) return;
          setIsSubmitFocused(true);
        } else if (!submitFocused) navigation.focusNextOption();
        return;
      }
      if (event.key === "tab" && event.shift) {
        event.preventDefault();
        if (submitButtonText && onSubmit && submitFocused) {
          setIsSubmitFocused(false);
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
        if (submitFocused && onDownFromLastItem) onDownFromLastItem();
        else if (submitButtonText && onSubmit && focusedValue === lastOptionValue && !submitFocused) {
          if (refuseSubmitFocus?.()) return;
          setIsSubmitFocused(true);
        } else if (!submitButtonText && onDownFromLastItem && focusedValue === lastOptionValue)
          onDownFromLastItem();
        else if (!submitFocused) navigation.focusNextOption();
        return;
      }
      if (
        event.key === "up" ||
        (event.ctrl && event.key === "p") ||
        (!event.ctrl && !event.shift && event.key === "k")
      ) {
        event.preventDefault();
        if (submitButtonText && onSubmit && submitFocused) {
          setIsSubmitFocused(false);
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
        if (event.ctrl && event.key === "return" && isInputOption && onSubmit) {
          onSubmit(selectedValues_2());
          return;
        }
        if (event.key === "return" && submitFocused && onSubmit) {
          onSubmit(selectedValues_2());
          return;
        }
        if (event.key === "return" && !submitButtonText && onSubmit) {
          onSubmit(selectedValues_2());
          return;
        }
        if (!submitFocused && focusedValue !== undefined) toggleValue(focusedValue);
        return;
      }
      if (!hideIndexes && /^[0-9]$/.test(normalizedInput)) {
        event.preventDefault();
        let index = parseInt(normalizedInput) - 1;
        if (index >= 0 && index < options.length) toggleValue(options[index].value);
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
