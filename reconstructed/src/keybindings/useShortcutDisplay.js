/**
 * keybindings/useShortcutDisplay.ts
 *
 * 并入已有模块：快捷键显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/useShortcutDisplay.ts
 * pieces: chunk-x2j6c7xd.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { j, R, P } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { logShortcutFallbackUsed } from "./shortcutFormat.js";

//@ chunk-x2j6c7xd.js:303-307 placement
j();
/**
 * 组件里显示某动作快捷键的 hook：从 KeybindingContext 取显示文字；拿不到时用回退文字并记一次回退事件；动作被解绑时返回空串。
 */
//@ chunk-x2j6c7xd.js:307-518 fingerprint = useShortcutDisplay (0.781)
function useShortcutDisplay(action, context, fallback) {
  let keybindingContext = useKeybindingContext(),
    resolved = keybindingContext?.getDisplayText(action, context),
    isFallback = resolved === void 0,
    reason = keybindingContext ? "action_not_found" : "no_context",
    hasLoggedRef = R(!1);
  if (
    (P(() => {
      if (isFallback && !hasLoggedRef.current)
        ((hasLoggedRef.current = !0), logShortcutFallbackUsed(action, context, fallback, reason));
    }, [isFallback, action, context, fallback, reason]),
    isFallback)
  )
    return fallback;
  return resolved === null ? "" : resolved;
}

export { useShortcutDisplay };
