/**
 * keybindings/useKeybindingDisplay.ts
 *
 * 2.1.316 新增：快捷键显示钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qfgcgf22.js (2)
 * attribution: placement 2
 */
import { init_react_production, R, P } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { getActionChord } from "./resolver.js";
import { logShortcutFallbackUsed } from "./shortcutFormat.js";
import { chordToString } from "./parser.js";

//@ chunk-qfgcgf22.js:310-314 placement
init_react_production();
//@ chunk-qfgcgf22.js:314-544 placement
/**
 * 取动作对应快捷键的显示文本；找不到绑定时回退给定文本并（一次性）上报回退原因。
 */
function useShortcutDisplay(action, i, t) {
  let keybindingContext = useKeybindingContext();
  let n = keybindingContext ? getActionChord(action, i, keybindingContext.bindings) : undefined;
  let r = n === undefined;
  let f = keybindingContext ? "action_not_found" : "no_context";
  let d = R(false);
  P(() => {
    if (r && !d.current) {
      d.current = true;
      logShortcutFallbackUsed(action, i, t, f);
    }
  }, [r, action, i, t, f]);
  if (n === undefined) return t;
  return n === null ? "" : chordToString(n);
}
export { useShortcutDisplay };
