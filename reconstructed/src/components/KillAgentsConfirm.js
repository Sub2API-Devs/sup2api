/**
 * components/KillAgentsConfirm.tsx
 *
 * 2.1.316 新增：终止后台代理的确认提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (4)
 * attribution: placement 4
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { rs } from "../state/AppState.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Text } from "../ink/components/Text.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-0e8j1zzj.js:27685-27760 placement
function va(f) {
  return f.notifications.current?.key === "kill-agents-confirm";
}
//@ chunk-0e8j1zzj.js:27760-27785 placement
var Ur = { keyCase: "lower" };
//@ chunk-0e8j1zzj.js:27785-28281 placement
function KillAgentsConfirm(o) {
  let u = w(6),
    t = useShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k"),
    d = rs(va);
  if (
    !((o?.type === "subagent" || o?.type === "workflow-agent") && o.stoppableByKillAgents === !0) ||
    t === ""
  ) {
    return null;
  }
  const m = d === !0 ? "again to stop background agents" : "twice to stop background agents";
  let i;
  if (u[0] !== t || u[1] !== m)
    ((i = e(KeyboardShortcutHint, { chord: t, action: m, format: Ur, terse: !0 })),
      (u[0] = t),
      (u[1] = m),
      (u[2] = i));
  else i = u[2];
  let h = i,
    k;
  if (u[3] !== d || u[4] !== h)
    ((k = d === !0 ? e(Text, { color: "text", children: h }) : h), (u[3] = d), (u[4] = h), (u[5] = k));
  else k = u[5];
  return k;
}
//@ chunk-0e8j1zzj.js:28281-28285 placement
j();

export { KillAgentsConfirm };
