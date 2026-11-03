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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../design-system/Tabs.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { yd, gd } from "../permissions/rules/CloudSessionRulesTab.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";

/**
 * /help 的命令标签页：列出可用命令及描述，按名称排序。
 */
//@ chunk-p2qwpk2k.js:19779-20255 fingerprint = Commands (0.526)
function Commands(t0) {
  let $ = w(10),
    { rules: rules, onExit: onExit } = t0,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    { rows: rows } = useTerminalSize(),
    x;
  if ($[0] !== rules) ((x = rules.map(yd)), ($[0] = rules), ($[1] = x));
  else x = $[1];
  const maxWidth = Math.max(3, Math.min(10, rows - 14));
  let c;
  if ($[2] !== onExit) ((c = () => onExit()), ($[2] = onExit), ($[3] = c));
  else c = $[3];
  let M;
  if ($[4] !== focusHeader || $[5] !== headerFocused || $[6] !== x || $[7] !== maxWidth || $[8] !== c)
    ((M = e(ModelSelector, {
      options: x,
      visibleOptionCount: maxWidth,
      hideIndexes: !0,
      isDisabled: headerFocused,
      onUpFromFirstItem: focusHeader,
      onChange: gd,
      onCancel: c,
    })),
      ($[4] = focusHeader),
      ($[5] = headerFocused),
      ($[6] = x),
      ($[7] = maxWidth),
      ($[8] = c),
      ($[9] = M));
  else M = $[9];
  return M;
}

export { Commands };
