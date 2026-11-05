/**
 * keybindings/useKeybindingDisplay.ts
 *
 * 2.1.316 新增：快捷键显示钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s4vz6xge.js (2)
 * attribution: placement 2
 */
import { init_react_production, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { getActionChord } from "./resolver.js";
import { logShortcutFallbackUsed } from "./shortcutFormat.js";
import { chordToString } from "./parser.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s4vz6xge.js:310-314 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s4vz6xge.js:310", () => {
  init_react_production();
});
//@ chunk-s4vz6xge.js:314-544 placement
/**
 * 取动作对应快捷键的显示文本；找不到绑定时回退给定文本并（一次性）上报回退原因。
 */
function useShortcutDisplay(action, context, fallback) {
  let keybindingContext = useKeybindingContext();
  let chord = keybindingContext ? getActionChord(action, context, keybindingContext.bindings) : undefined;
  let isMissing = chord === undefined;
  let fallbackReason = keybindingContext ? "action_not_found" : "no_context";
  let hasLogged = useRef(false);
  useEffect(() => {
    if (isMissing && !hasLogged.current) {
      hasLogged.current = true;
      logShortcutFallbackUsed(action, context, fallback, fallbackReason);
    }
  }, [isMissing, action, context, fallback, fallbackReason]);
  if (chord === undefined) return fallback;
  return chord === null ? "" : chordToString(chord);
}
export { useShortcutDisplay };
