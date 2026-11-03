/**
 * components/agents/ModelSelector.tsx
 *
 * 通用模型选择组件（被 115 处引用，实际是共享的选择器组件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/ModelSelector.tsx
 * pieces: chunk-ey2qag4x.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { NO_COMMITTED_ROW, Select_2 } from "../CustomSelect/select.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Select } from "../CustomSelect/selectTypeahead.js";

/**
 * 通用选择组件（Select 封装），被 115 处使用——旧版名 ModelSelector 可能是错配。
 */
//@ chunk-ey2qag4x.js:43807-44614 callgraph-fingerprint = ModelSelector (0.251)
function ModelSelector(t0) {
  let $ = w(12);
  if (useIsScreenReaderEnabled()) {
    const i = t0.selectedValue === NO_COMMITTED_ROW ? t0.defaultValue : (t0.selectedValue ?? t0.defaultValue);
    let l;
    if (
      $[0] !== t0.disableSelection ||
      $[1] !== t0.hidePromptWhileDisabled ||
      $[2] !== t0.isDisabled ||
      $[3] !== t0.onCancel ||
      $[4] !== t0.onChange ||
      $[5] !== t0.onFocus ||
      $[6] !== t0.options ||
      $[7] !== t0.refuseInput ||
      $[8] !== i
    )
      ((l = e(Select, {
        options: t0.options,
        onChange: t0.onChange,
        onFocus: t0.onFocus,
        onCancel: t0.onCancel,
        isDisabled: t0.isDisabled,
        disableSelection: t0.disableSelection,
        refuseInput: t0.refuseInput,
        hidePromptWhileDisabled: t0.hidePromptWhileDisabled,
        defaultValue: i,
      })),
        ($[0] = t0.disableSelection),
        ($[1] = t0.hidePromptWhileDisabled),
        ($[2] = t0.isDisabled),
        ($[3] = t0.onCancel),
        ($[4] = t0.onChange),
        ($[5] = t0.onFocus),
        ($[6] = t0.options),
        ($[7] = t0.refuseInput),
        ($[8] = i),
        ($[9] = l));
    else l = $[9];
    return l;
  }
  let i;
  if ($[10] !== t0) ((i = e(Select_2, { ...t0 })), ($[10] = t0), ($[11] = i));
  else i = $[11];
  return i;
}

export { ModelSelector };
