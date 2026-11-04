/**
 * components/HelpV2/Commands.tsx
 *
 * /help 的命令列表标签页（内置/自定义命令及描述）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HelpV2/Commands.tsx
 * pieces: chunk-p2qwpk2k.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { toRuleOption, noopRulePicker } from "../permissions/rules/CloudSessionRulesTab.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-p2qwpk2k.js:19779-20255 fingerprint (2.1.88 match: Commands, 0.526)
/**
 * /help 的命令标签页：列出可用命令及描述，按名称排序。
 */
function Commands(props) {
  let $ = useMemoCache(10);
  let { rules, onExit } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let { rows } = useTerminalSize();
  let options;
  if ($[0] !== rules) {
    options = rules.map(toRuleOption);
    $[0] = rules;
    $[1] = options;
  } else options = $[1];
  const maxWidth = Math.max(3, Math.min(10, rows - 14));
  let onCancel;
  if ($[2] !== onExit) {
    onCancel = () => onExit();
    $[2] = onExit;
    $[3] = onCancel;
  } else onCancel = $[3];
  let picker;
  if (
    $[4] !== focusHeader ||
    $[5] !== headerFocused ||
    $[6] !== options ||
    $[7] !== maxWidth ||
    $[8] !== onCancel
  ) {
    picker = jsxProd_default(ModelSelector, {
      options,
      visibleOptionCount: maxWidth,
      hideIndexes: true,
      isDisabled: headerFocused,
      onUpFromFirstItem: focusHeader,
      onChange: noopRulePicker,
      onCancel,
    });
    $[4] = focusHeader;
    $[5] = headerFocused;
    $[6] = options;
    $[7] = maxWidth;
    $[8] = onCancel;
    $[9] = picker;
  } else picker = $[9];
  return picker;
}
export { Commands };
