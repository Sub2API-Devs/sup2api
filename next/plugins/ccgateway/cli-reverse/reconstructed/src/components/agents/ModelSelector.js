/**
 * components/agents/ModelSelector.tsx
 *
 * 通用模型选择组件（被 115 处引用，实际是共享的选择器组件）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/ModelSelector.tsx
 * pieces: chunk-p1yqn9ds.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { NO_COMMITTED_ROW, Select_2 } from "../CustomSelect/select.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Select } from "../CustomSelect/selectTypeahead.js";

//@ chunk-p1yqn9ds.js:43398-44205 callgraph-fingerprint (2.1.88 match: ModelSelector, 0.25)
function ModelSelector(t0) {
  let $ = useMemoCache(12);
  if (useIsScreenReaderEnabled()) {
    const defaultValue =
      t0.selectedValue === NO_COMMITTED_ROW ? t0.defaultValue : (t0.selectedValue ?? t0.defaultValue);
    let selectElement;
    if (
      $[0] !== t0.disableSelection ||
      $[1] !== t0.hidePromptWhileDisabled ||
      $[2] !== t0.isDisabled ||
      $[3] !== t0.onCancel ||
      $[4] !== t0.onChange ||
      $[5] !== t0.onFocus ||
      $[6] !== t0.options ||
      $[7] !== t0.refuseInput ||
      $[8] !== defaultValue
    ) {
      selectElement = jsxProd_default(Select, {
        options: t0.options,
        onChange: t0.onChange,
        onFocus: t0.onFocus,
        onCancel: t0.onCancel,
        isDisabled: t0.isDisabled,
        disableSelection: t0.disableSelection,
        refuseInput: t0.refuseInput,
        hidePromptWhileDisabled: t0.hidePromptWhileDisabled,
        defaultValue,
      });
      $[0] = t0.disableSelection;
      $[1] = t0.hidePromptWhileDisabled;
      $[2] = t0.isDisabled;
      $[3] = t0.onCancel;
      $[4] = t0.onChange;
      $[5] = t0.onFocus;
      $[6] = t0.options;
      $[7] = t0.refuseInput;
      $[8] = defaultValue;
      $[9] = selectElement;
    } else selectElement = $[9];
    return selectElement;
  }
  let selectElement;
  if ($[10] !== t0) {
    selectElement = jsxProd_default(Select_2, {
      ...t0,
    });
    $[10] = t0;
    $[11] = selectElement;
  } else selectElement = $[11];
  return selectElement;
}
export { ModelSelector };
