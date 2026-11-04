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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
  let $ = useMemoCache(6);
  let { message, onCancel, escAction } = props;
  let action = escAction === undefined ? "cancel" : escAction;
  let keyOpts;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keyOpts = {
      context: "Settings",
    };
    $[0] = keyOpts;
  } else keyOpts = $[0];
  useKeybinding("confirm:no", onCancel, keyOpts);
  useKeybinding("app:interrupt", onCancel);
  let escHint;
  if ($[1] !== action) {
    escHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action,
      parens: true,
    });
    $[1] = action;
    $[2] = escHint;
  } else escHint = $[2];
  let line;
  if ($[3] !== message || $[4] !== escHint) {
    line = jsxProd_default_2(Text, {
      dimColor: true,
      children: [message, " ", escHint],
    });
    $[3] = message;
    $[4] = escHint;
    $[5] = line;
  } else line = $[5];
  return line;
}
export { PromptDialog };
