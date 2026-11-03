/**
 * components/CustomSelect/use-select-state.ts
 *
 * Select 状态 hook（组合导航与当前值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-select-state.ts
 * pieces: chunk-ey2qag4x.js (1)
 * attribution: fingerprint 1
 */
import { y, ce } from "../../../vendor/react/cjs/react.production.js";
import { useSelectNavigation } from "./use-select-navigation.js";

//@ chunk-ey2qag4x.js:42760-43084 fingerprint = useSelectState (0.744)
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
  let [value, setValue] = y(defaultValue);
  let navigation = useSelectNavigation({
    visibleOptionCount,
    options,
    onFocus,
    focusValue,
  });
  let { getFocusedValue } = navigation;
  let selectFocusedOption = ce(() => {
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
