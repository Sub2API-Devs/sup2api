/**
 * components/ConfigurableShortcutHint.tsx
 *
 * 可配置快捷键提示：按 keybinding 动作取用户当前绑定的键显示 "<键> to <动作>"（被 70+ 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ConfigurableShortcutHint.tsx
 * pieces: chunk-4dnha4dk.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-4dnha4dk.js:332-644 fingerprint = ConfigurableShortcutHint (0.556)
function ConfigurableShortcutHint(props) {
  let $ = useMemoCache(7);
  let { action, context, fallback, description, parens, bold, terse, format } = props;
  let shortcut = useShortcutDisplay(action, context, fallback);
  let t1;
  if (
    $[0] !== bold ||
    $[1] !== shortcut ||
    $[2] !== description ||
    $[3] !== format ||
    $[4] !== parens ||
    $[5] !== terse
  ) {
    t1 = jsxProd_default(KeyboardShortcutHint, {
      chord: shortcut,
      action: description,
      parens,
      bold,
      terse,
      format,
    });
    $[0] = bold;
    $[1] = shortcut;
    $[2] = description;
    $[3] = format;
    $[4] = parens;
    $[5] = terse;
    $[6] = t1;
  } else t1 = $[6];
  return t1;
}
export { ConfigurableShortcutHint };
