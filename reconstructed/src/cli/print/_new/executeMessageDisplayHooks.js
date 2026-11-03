/**
 * cli/print/_new/executeMessageDisplayHooks.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../../utils/hooks/hookEvents.js";
import { createBaseHookInput, hookInputCwd, executeHooks } from "../../../utils/hooks.js";

/**
 * 执行 MessageDisplay 钩子（316 新增）：输入 turn_id/message_id/index/final/delta，强制同步、关闭逐次遥测；钩子可返回 displayContent 替换屏幕显示。
 */
//@ chunk-e6aww6q8.js:3422713-3423077 sole-consumer-new
async function* executeMessageDisplayHooks(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS, y, S) {
  let w = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "MessageDisplay",
    turn_id: n.turnId,
    message_id: n.messageId,
    index: n.index,
    final: n.final,
    delta: n.delta,
  };
  yield* executeHooks({
    session: e,
    hookInput: w,
    toolUseID: `${n.messageId}-${n.index}`,
    signal: s,
    timeoutMs: h,
    sessionHooks: r,
    forceSyncExecution: !0,
    suppressPerInvocationTelemetry: !0,
    storageV5: y,
    credentials: S,
  });
}

export { executeMessageDisplayHooks };
