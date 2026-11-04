/**
 * utils/abortReasons.ts
 *
 * 2.1.316 新增：中止原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { unwrapAbortReason } from "./abortController.js";

//@ chunk-e6aww6q8.js:186494-186593 placement
/**
 * 判断中止是否属于回合级（turn-abort 或 permission-stop），非 turn 范围直接 false。
 */
var isTurnLevelAbort = (reason, caller) => {
  if (caller !== "turn") return false;
  let unwrappedReason = unwrapAbortReason(reason);
  return unwrappedReason === "turn-abort" || unwrappedReason === "permission-stop";
};
//@ chunk-e6aww6q8.js:186593-186713 placement
/**
 * 给中止信号注册一次性监听，返回可 dispose 的对象以便在作用域结束时移除。
 */
function onAbortDisposable(signal, listener) {
  signal.addEventListener("abort", listener, {
    once: true,
  });
  return {
    [Symbol.dispose]() {
      signal.removeEventListener("abort", listener);
    },
  };
}
//@ chunk-e6aww6q8.js:186713-186807 placement
/**
 * 按 innerCall 与 agentId 判断中止来源范围（inner/turn/agent）。
 */
function abortScopeOf(toolUseContext) {
  let isInnerCall = toolUseContext.innerCall === true;
  let hasNoAgentId = toolUseContext.agentId === undefined;
  return isInnerCall ? "inner" : hasNoAgentId ? "turn" : "agent";
}
export { abortScopeOf, isTurnLevelAbort, onAbortDisposable };
