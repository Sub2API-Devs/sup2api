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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:415192-415610 callgraph-fingerprint = PromptDialog (0.182)
function PromptDialog(t0) {
  let $ = w(6),
    { message: message, onCancel: onCancel, escAction: escAction } = t0,
    ee = escAction === void 0 ? "cancel" : escAction,
    Re;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Re = { context: "Settings" }), ($[0] = Re));
  else Re = $[0];
  (useKeybinding("confirm:no", onCancel, Re), useKeybinding("app:interrupt", onCancel));
  let Be;
  if ($[1] !== ee)
    ((Be = e(KeyboardShortcutHint, { chord: "escape", action: ee, parens: !0 })), ($[1] = ee), ($[2] = Be));
  else Be = $[2];
  let He;
  if ($[3] !== message || $[4] !== Be)
    ((He = r(Text, { dimColor: !0, children: [message, " ", Be] })),
      ($[3] = message),
      ($[4] = Be),
      ($[5] = He));
  else He = $[5];
  return He;
}

export { PromptDialog };
