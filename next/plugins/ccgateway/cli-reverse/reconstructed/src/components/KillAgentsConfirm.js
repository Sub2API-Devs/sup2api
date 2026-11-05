/**
 * components/KillAgentsConfirm.tsx
 *
 * 2.1.316 新增：终止后台代理的确认提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (4)
 * attribution: placement 4
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { useAppStateSlice } from "../state/AppState.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Text } from "../ink/components/Text.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:33876-33880 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:33876", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:36822-36897 placement
function hasKillAgentsConfirmNotice(appState) {
  return appState.notifications.current?.key === "kill-agents-confirm";
}
//@ chunk-8prszgkd.js:36897-36922 placement
var SHORTCUT_FORMAT_OPTIONS = {
  keyCase: "lower",
};
//@ chunk-8prszgkd.js:36922-37418 placement
function KillAgentsConfirm(requestSource) {
  let $ = useMemoCache(6);
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
  let hint;
  if ($[0] !== shortcutDisplay || $[1] !== action) {
    hint = jsxProd_default(KeyboardShortcutHint, {
      chord: shortcutDisplay,
      action,
      format: SHORTCUT_FORMAT_OPTIONS,
      terse: true,
    });
    $[0] = shortcutDisplay;
    $[1] = action;
    $[2] = hint;
  } else hint = $[2];
  let hint_2 = hint;
  let content;
  if ($[3] !== appStateSlice || $[4] !== hint_2) {
    content =
      appStateSlice === true
        ? jsxProd_default(Text, {
            color: "text",
            children: hint_2,
          })
        : hint_2;
    $[3] = appStateSlice;
    $[4] = hint_2;
    $[5] = content;
  } else content = $[5];
  return content;
}
export { KillAgentsConfirm };
