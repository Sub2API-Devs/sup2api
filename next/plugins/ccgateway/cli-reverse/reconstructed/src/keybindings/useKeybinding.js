/**
 * keybindings/useKeybinding.ts
 *
 * 已有模块；g2 补充放置门面声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/useKeybinding.ts
 * pieces: chunk-2nf232h2.js (2), chunk-p762h6ag.js (2)
 * attribution: placement 2, callgraph-witnessed 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { useExitOnCtrlCD } from "../hooks/useExitOnCtrlCD.js";
import { MessageActionsKeybindings } from "../components/messageActions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p762h6ag.js:356-360 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p762h6ag.js:356", () => {
  init_react_production();
});
//@ chunk-p762h6ag.js:360-598 fingerprint (2.1.88 match: useKeybinding, 0.407)
/**
 * 注册一个动作处理器（默认 Global 上下文）；处理器存在引用里，换函数不用重新注册。
 */
function useKeybinding(action, handler, options = {}) {
  let { context = "Global", isActive = true } = options;
  let keybindingContext = useKeybindingContext();
  let [handlerRef] = useState(() => ({
    handler,
  }));
  useLayoutEffect(() => {
    handlerRef.handler = handler;
  });
  useEffect(() => {
    if (!keybindingContext || !isActive) return;
    return keybindingContext.registerHandler({
      action,
      context,
      handler: () => handlerRef.handler(),
      singleKey: true,
    });
  }, [action, context, keybindingContext, isActive, handlerRef]);
}
//@ chunk-2nf232h2.js:532-536 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2nf232h2.js:532", () => {
  init_react_production();
});
//@ chunk-2nf232h2.js:536-710 callgraph-witnessed (2.1.88 match: useKeybindings, 0.168)
/**
 * 把 app:interrupt / app:exit 绑到 Ctrl+C/Ctrl+D 双击退出逻辑（Global 上下文），返回退出提示状态。
 */
function useGlobalExitKeybindings(shouldIntercept, exitOverride, isActive = true) {
  let { handleInterrupt, handleExit, exitState } = useExitOnCtrlCD(exitOverride, shouldIntercept);
  let handleInput = useMemo(
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
export { useKeybinding, useGlobalExitKeybindings };
