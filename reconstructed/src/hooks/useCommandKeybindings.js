/**
 * hooks/useCommandKeybindings.tsx
 *
 * 把 "command:<名字>" 形式的 keybinding 动作绑定为提交对应斜杠命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCommandKeybindings.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 2
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { UV } from "../context/overlayContext.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";

/**
 * 提交命令时使用的空 helpers（setCursorOffset/clearBuffer/resetHistory 都是 no-op）。
 */
//@ chunk-18hwfzwa.js:177498-177569 fingerprint = NOOP_HELPERS (1)
var NOOP_HELPERS = { setCursorOffset: () => {}, clearBuffer: () => {}, resetHistory: () => {} };
/**
 * 读取 keybinding 配置中 "command:<name>" 动作并绑定为提交 "/<name>"。
 */
//@ chunk-18hwfzwa.js:177569-178226 fingerprint = CommandKeybindingHandlers (0.727)
function CommandKeybindingHandlers(t0) {
  let $ = w(8),
    { onSubmit: onSubmit } = t0,
    keybindingContext = useKeybindingContext(),
    isModalOverlayActive = UV(),
    ee = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    ke;
  He: {
    if (!keybindingContext) {
      let Be;
      if ($[0] === MEMO_CACHE_SENTINEL) ((Be = new Set()), ($[0] = Be));
      else Be = $[0];
      ke = Be;
      break He;
    }
    let We;
    if ($[1] !== keybindingContext.bindings) {
      We = new Set();
      for (const binding of keybindingContext.bindings) {
        if (binding.action?.startsWith("command:")) We.add(binding.action);
      }
      (($[1] = keybindingContext.bindings), ($[2] = We));
    } else We = $[2];
    ke = We;
  }
  let Xe = ke,
    rt;
  if ($[3] !== Xe || $[4] !== onSubmit) {
    rt = {};
    for (const action of Xe) {
      let commandName = action.slice(8);
      rt[action] = () => {
        onSubmit(`/${commandName}`, NOOP_HELPERS, { fromKeybinding: !0, inputModeOverride: "prompt" });
      };
    }
    (($[3] = Xe), ($[4] = onSubmit), ($[5] = rt));
  } else rt = $[5];
  let It = rt;
  const t3 = !ee && !isModalOverlayActive;
  let Ot;
  if ($[6] !== t3) ((Ot = { context: "Chat", isActive: t3 }), ($[6] = t3), ($[7] = Ot));
  else Ot = $[7];
  return (MessageActionsKeybindings(It, Ot), null);
}

export { NOOP_HELPERS, CommandKeybindingHandlers };
