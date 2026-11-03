/**
 * components/hooks/PromptDialog.tsx
 *
 * 通用输入对话框（被 7 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/PromptDialog.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:415192-415610 callgraph-fingerprint = PromptDialog (0.182)
function PromptDialog(props) {
  let $ = w(6);
  let { message, onCancel, escAction } = props;
  let action = escAction === undefined ? "cancel" : escAction;
  let Re;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Re = {
      context: "Settings",
    };
    $[0] = Re;
  } else Re = $[0];
  useKeybinding("confirm:no", onCancel, Re);
  useKeybinding("app:interrupt", onCancel);
  let Be;
  if ($[1] !== action) {
    Be = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action,
      parens: true,
    });
    $[1] = action;
    $[2] = Be;
  } else Be = $[2];
  let He;
  if ($[3] !== message || $[4] !== Be) {
    He = jsxProd_default_2(Text, {
      dimColor: true,
      children: [message, " ", Be],
    });
    $[3] = message;
    $[4] = Be;
    $[5] = He;
  } else He = $[5];
  return He;
}
export { PromptDialog };
