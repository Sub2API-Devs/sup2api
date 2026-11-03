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
import { init_react_production, Q, y, zt, P } from "../../vendor/react/cjs/react.production.js";
import { useExitOnCtrlCD } from "../hooks/useExitOnCtrlCD.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import { useKeybindingContext } from "./KeybindingContext.js";

//@ chunk-1kwgxcw6.js:532-536 placement
init_react_production();
//@ chunk-1kwgxcw6.js:536-710 callgraph-witnessed = useKeybindings (0.168)
/**
 * 把 app:interrupt / app:exit 绑到 Ctrl+C/Ctrl+D 双击退出逻辑（Global 上下文），返回退出提示状态。
 */
function useGlobalExitKeybindings(l, a, isActive = true) {
  let { handleInterrupt, handleExit, exitState } = useExitOnCtrlCD(a, l);
  let handleInput = Q(
    () => ({
      "app:interrupt": handleInterrupt,
      "app:exit": handleExit,
    }),
    [handleInterrupt, handleExit],
  );
  MessageActionsKeybindings(handleInput, {
    context: "Global",
    isActive,
  });
  return exitState;
}
//@ chunk-yzt83vwd.js:356-360 placement
init_react_production();
//@ chunk-yzt83vwd.js:360-598 fingerprint = useKeybinding (0.408)
/**
 * 注册一个动作处理器（默认 Global 上下文）；处理器存在引用里，换函数不用重新注册。
 */
function useKeybinding(action, handler, options = {}) {
  let { context = "Global", isActive = true } = options;
  let keybindingContext = useKeybindingContext();
  let [i] = y(() => ({
    handler,
  }));
  zt(() => {
    i.handler = handler;
  });
  P(() => {
    if (!keybindingContext || !isActive) return;
    return keybindingContext.registerHandler({
      action,
      context,
      handler: () => i.handler(),
      singleKey: true,
    });
  }, [action, context, keybindingContext, isActive, i]);
}
export { useGlobalExitKeybindings, useKeybinding };
