/**
 * keybindings/useKeybinding.ts
 *
 * 已有模块；g2 补充放置门面声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/useKeybinding.ts
 * pieces: chunk-1kwgxcw6.js (2), chunk-yzt83vwd.js (2)
 * attribution: placement 2, callgraph-witnessed 1, fingerprint 1
 */
import { j, Q, y, zt, P } from "../../vendor/react/cjs/react.production.js";
import { useExitOnCtrlCD } from "../hooks/useExitOnCtrlCD.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import { useKeybindingContext } from "./KeybindingContext.js";

//@ chunk-1kwgxcw6.js:532-536 placement
j();
/**
 * 把 app:interrupt / app:exit 绑到 Ctrl+C/Ctrl+D 双击退出逻辑（Global 上下文），返回退出提示状态。
 */
//@ chunk-1kwgxcw6.js:536-710 callgraph-witnessed = useKeybindings (0.168)
function useGlobalExitKeybindings(l, a, n = !0) {
  let {
      handleInterrupt: handleInterrupt,
      handleExit: handleExit,
      exitState: exitState,
    } = useExitOnCtrlCD(a, l),
    handleInput = Q(
      () => ({ "app:interrupt": handleInterrupt, "app:exit": handleExit }),
      [handleInterrupt, handleExit],
    );
  return (MessageActionsKeybindings(handleInput, { context: "Global", isActive: n }), exitState);
}
//@ chunk-yzt83vwd.js:356-360 placement
j();
/**
 * 注册一个动作处理器（默认 Global 上下文）；处理器存在引用里，换函数不用重新注册。
 */
//@ chunk-yzt83vwd.js:360-598 fingerprint = useKeybinding (0.408)
function useKeybinding(action, handler, options = {}) {
  let { context: context = "Global", isActive: isActive = !0 } = options,
    keybindingContext = useKeybindingContext(),
    [i] = y(() => ({ handler: handler }));
  (zt(() => {
    i.handler = handler;
  }),
    P(() => {
      if (!keybindingContext || !isActive) return;
      return keybindingContext.registerHandler({
        action: action,
        context: context,
        handler: () => i.handler(),
        singleKey: !0,
      });
    }, [action, context, keybindingContext, isActive, i]));
}

export { useGlobalExitKeybindings, useKeybinding };
