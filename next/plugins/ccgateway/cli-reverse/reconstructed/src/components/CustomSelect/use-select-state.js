/**
 * components/CustomSelect/use-select-state.ts
 *
 * Select 状态 hook（组合导航与当前值）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-select-state.ts
 * pieces: chunk-p1yqn9ds.js (1)
 * attribution: fingerprint 1
 */
import { useState, useCallback } from "../../../vendor/react/cjs/react.production.js";
import { useSelectNavigation } from "./use-select-navigation.js";

//@ chunk-p1yqn9ds.js:42381-42705 fingerprint (2.1.88 match: useSelectState, 0.744)
function useSelectState_2({
  visibleOptionCount = 5,
  options,
  defaultValue,
  selectedValue,
  onChange,
  onCancel,
  onFocus,
  focusValue,
}) {
  let [value, setValue] = useState(defaultValue);
  let navigation = useSelectNavigation({
    visibleOptionCount,
    options,
    onFocus,
    focusValue,
  });
  let { getFocusedValue } = navigation;
  let selectFocusedOption = useCallback(() => {
    setValue(getFocusedValue());
  }, [getFocusedValue]);
  return {
    ...navigation,
    value: selectedValue !== undefined ? selectedValue : value,
    selectFocusedOption,
    onChange,
    onCancel,
  };
}
export { useSelectState_2 };
