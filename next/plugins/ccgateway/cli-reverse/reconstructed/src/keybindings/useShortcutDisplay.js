/**
 * keybindings/useShortcutDisplay.ts
 *
 * 并入已有模块：快捷键显示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/useShortcutDisplay.ts
 * pieces: chunk-01qc1xy2.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { logShortcutFallbackUsed } from "./shortcutFormat.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-01qc1xy2.js:303-307 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-01qc1xy2.js:303", () => {
  init_react_production();
});
//@ chunk-01qc1xy2.js:307-518 fingerprint (2.1.88 match: useShortcutDisplay, 0.78)
/**
 * 组件里显示某动作快捷键的 hook：从 KeybindingContext 取显示文字；拿不到时用回退文字并记一次回退事件；动作被解绑时返回空串。
 */
function useShortcutDisplay(action, context, fallback) {
  let keybindingContext = useKeybindingContext();
  let resolved = keybindingContext?.getDisplayText(action, context);
  let isFallback = resolved === undefined;
  let reason = keybindingContext ? "action_not_found" : "no_context";
  let hasLoggedRef = useRef(false);
  useEffect(() => {
    if (isFallback && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logShortcutFallbackUsed(action, context, fallback, reason);
    }
  }, [isFallback, action, context, fallback, reason]);
  if (isFallback) return fallback;
  return resolved === null ? "" : resolved;
}
export { useShortcutDisplay };
