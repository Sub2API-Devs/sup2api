/**
 * hooks/useCommandKeybindings.tsx
 *
 * 把 "command:<名字>" 形式的 keybinding 动作绑定为提交对应斜杠命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCommandKeybindings.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useThirdOverlayKeys } from "../context/overlayContext.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";

//@ chunk-czq1j3j2.js:150324-150395 fingerprint (2.1.88 match: NOOP_HELPERS, 1)
/**
 * 提交命令时使用的空 helpers（setCursorOffset/clearBuffer/resetHistory 都是 no-op）。
 */
var NOOP_HELPERS = {
  setCursorOffset: () => {},
  clearBuffer: () => {},
  resetHistory: () => {},
};
//@ chunk-czq1j3j2.js:150395-151052 fingerprint (2.1.88 match: CommandKeybindingHandlers, 0.728)
/**
 * 读取 keybinding 配置中 "command:<name>" 动作并绑定为提交 "/<name>"。
 */
function CommandKeybindingHandlers(props) {
  let $ = useMemoCache(8);
  let { onSubmit } = props;
  let keybindingContext = useKeybindingContext();
  let isModalOverlayActive = useThirdOverlayKeys();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let t2;
  je: {
    if (!keybindingContext) {
      let t3;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        t3 = new Set();
        $[0] = t3;
      } else t3 = $[0];
      t2 = t3;
      break je;
    }
    let actions;
    if ($[1] !== keybindingContext.bindings) {
      actions = new Set();
      for (const binding of keybindingContext.bindings) {
        if (binding.action?.startsWith("command:")) actions.add(binding.action);
      }
      $[1] = keybindingContext.bindings;
      $[2] = actions;
    } else actions = $[2];
    t2 = actions;
  }
  let commandActions = t2;
  let map;
  if ($[3] !== commandActions || $[4] !== onSubmit) {
    map = {};
    for (const action of commandActions) {
      let commandName = action.slice(8);
      map[action] = () => {
        onSubmit(`/${commandName}`, NOOP_HELPERS, {
          fromKeybinding: true,
          inputModeOverride: "prompt",
        });
      };
    }
    $[3] = commandActions;
    $[4] = onSubmit;
    $[5] = map;
  } else map = $[5];
  let handlers = map;
  const isActive = !dialogOfKind && !isModalOverlayActive;
  let t4;
  if ($[6] !== isActive) {
    t4 = {
      context: "Chat",
      isActive,
    };
    $[6] = isActive;
    $[7] = t4;
  } else t4 = $[7];
  MessageActionsKeybindings(handlers, t4);
  return null;
}
export { NOOP_HELPERS, CommandKeybindingHandlers };
