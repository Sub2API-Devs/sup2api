/**
 * utils/abortReasons.ts
 *
 * 2.1.316 新增：中止原因
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { unwrapAbortReason } from "./abortController.js";

//@ chunk-5xgkngpb.js:186604-186703 placement
/**
 * 判断中止是否属于回合级（turn-abort 或 permission-stop），非 turn 范围直接 false。
 */
var isTurnLevelAbort = (reason, caller) => {
  if (caller !== "turn") return false;
  let unwrappedReason = unwrapAbortReason(reason);
  return unwrappedReason === "turn-abort" || unwrappedReason === "permission-stop";
};
//@ chunk-5xgkngpb.js:186703-186823 placement
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
//@ chunk-5xgkngpb.js:186823-186917 placement
/**
 * 按 innerCall 与 agentId 判断中止来源范围（inner/turn/agent）。
 */
function abortScopeOf(toolUseContext) {
  let isInnerCall = toolUseContext.innerCall === true;
  let hasNoAgentId = toolUseContext.agentId === undefined;
  return isInnerCall ? "inner" : hasNoAgentId ? "turn" : "agent";
}
export { isTurnLevelAbort, abortScopeOf, onAbortDisposable };
