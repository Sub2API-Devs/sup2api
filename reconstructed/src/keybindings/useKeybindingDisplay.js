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
import { j, R, P } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { getActionChord } from "./resolver.js";
import { logShortcutFallbackUsed } from "./shortcutFormat.js";
import { chordToString } from "./parser.js";

//@ chunk-qfgcgf22.js:310-314 placement
j();
/**
 * 取动作对应快捷键的显示文本；找不到绑定时回退给定文本并（一次性）上报回退原因。
 */
//@ chunk-qfgcgf22.js:314-544 placement
function useShortcutDisplay(e, i, t) {
  let o = useKeybindingContext(),
    n = o ? getActionChord(e, i, o.bindings) : void 0,
    r = n === void 0,
    f = o ? "action_not_found" : "no_context",
    d = R(!1);
  if (
    (P(() => {
      if (r && !d.current) ((d.current = !0), logShortcutFallbackUsed(e, i, t, f));
    }, [r, e, i, t, f]),
    n === void 0)
  )
    return t;
  return n === null ? "" : chordToString(n);
}

export { useShortcutDisplay };
