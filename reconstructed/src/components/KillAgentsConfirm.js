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
import { useAppStateSlice } from "../state/AppState.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Text } from "../ink/components/Text.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-0e8j1zzj.js:27685-27760 placement
function hasKillAgentsConfirmNotice(f) {
  return f.notifications.current?.key === "kill-agents-confirm";
}
//@ chunk-0e8j1zzj.js:27760-27785 placement
var SHORTCUT_FORMAT_OPTIONS = {
  keyCase: "lower",
};
//@ chunk-0e8j1zzj.js:27785-28281 placement
function KillAgentsConfirm(requestSource) {
  let u = w(6);
  let shortcutDisplay = useShortcutDisplay("chat:killAgents", "Chat", "ctrl+x ctrl+k");
  let appStateSlice = useAppStateSlice(hasKillAgentsConfirmNotice);
  if (
    !(
      (requestSource?.type === "subagent" || requestSource?.type === "workflow-agent") &&
      requestSource.stoppableByKillAgents === true
    ) ||
    shortcutDisplay === ""
  ) {
    return null;
  }
  const action =
    appStateSlice === true ? "again to stop background agents" : "twice to stop background agents";
  let i;
  if (u[0] !== shortcutDisplay || u[1] !== action) {
    i = jsxProd_default(KeyboardShortcutHint, {
      chord: shortcutDisplay,
      action,
      format: SHORTCUT_FORMAT_OPTIONS,
      terse: true,
    });
    u[0] = shortcutDisplay;
    u[1] = action;
    u[2] = i;
  } else i = u[2];
  let h = i;
  let k;
  if (u[3] !== appStateSlice || u[4] !== h) {
    k =
      appStateSlice === true
        ? jsxProd_default(Text, {
            color: "text",
            children: h,
          })
        : h;
    u[3] = appStateSlice;
    u[4] = h;
    u[5] = k;
  } else k = u[5];
  return k;
}
//@ chunk-0e8j1zzj.js:28281-28285 placement
init_react_production();
export { KillAgentsConfirm };
