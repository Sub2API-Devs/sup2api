/**
 * utils/hooks/hookEvents.ts
 *
 * 钩子进度/响应的 SDK 事件发出、terminalSequence 处理和钩子时间常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/hookEvents.ts
 * pieces: chunk-63641kq7.js (1), chunk-e6aww6q8.js (4), chunk-fe6rs39h.js (1)
 * attribution: fingerprint 4, placement 2
 */
import { getHookEventEmitState, F1e } from "./hookEventHelpers.js";
import { HOOK_EVENTS, emitHookProgress } from "../../entrypoints/sdk/coreSchemas.js";
import { isSyncHookJSONOutput } from "../../types/hooks.js";
import { renderTerminalSequences } from "./terminalSequence.js";
import { logForDebugging } from "../debug.js";

/**
 * 该钩子事件是否要作为 SDK 消息发出（默认集合，或开启全部时的所有钩子事件）。
 */
//@ chunk-e6aww6q8.js:935830-935924 placement
function shouldEmitHookEvent(hookEvent) {
  if (ALWAYS_EMITTED_HOOK_EVENTS.includes(hookEvent)) return !0;
  return getHookEventEmitState().allHookEventsEnabled && HOOK_EVENTS.includes(hookEvent);
}
/**
 * 钩子运行期间每秒（默认）把 stdout/stderr 变化作为 SDK hook_progress 事件发出；事件不在 SDK 允许列表时不启动。
 */
//@ chunk-e6aww6q8.js:936333-936636 fingerprint = startHookProgressInterval (1)
function startHookProgressInterval(params) {
  if (!shouldEmitHookEvent(params.hookEvent)) return () => {};
  let lastEmittedOutput = "",
    interval = setInterval(() => {
      params.getOutput().then(({ stdout: stdout, stderr: stderr, output: output }) => {
        if (output === lastEmittedOutput) return;
        ((lastEmittedOutput = output),
          emitHookProgress({
            hookId: params.hookId,
            hookName: params.hookName,
            hookEvent: params.hookEvent,
            stdout: stdout,
            stderr: stderr,
            output: output,
          }));
      });
    }, params.intervalMs ?? 1000);
  return (interval.unref(), () => clearInterval(interval));
}
//@ chunk-e6aww6q8.js:1291653-1291797 placement
var TOOL_HOOK_EVENTS = new Set([
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PermissionRequest",
    "PermissionDenied",
  ]),
  TOOL_AND_BATCH_HOOK_EVENTS = new Set([...TOOL_HOOK_EVENTS, "PostToolBatch"]);
/**
 * 处理钩子 JSON 里的 terminalSequence（只允许 OSC 0/1/2/9/99/777 与 BEL），通过则写到终端。
 */
//@ chunk-e6aww6q8.js:3558143-3558460 fingerprint = emitHookResponse (0.353)
function emitHookResponse_2(e, n) {
  if (!e || !isSyncHookJSONOutput(e) || !e.terminalSequence) return;
  let r = renderTerminalSequences(e.terminalSequence);
  if (r !== null) F1e(r);
  else
    logForDebugging(
      `Hook ${n} returned a terminalSequence that was rejected by the allowlist (only OSC 0/1/2/9/99/777 and BEL are permitted, and OSC 9 bodies may not begin with a digit unless in the 9;4 progress form)`,
    );
}
/**
 * 钩子时间常量：默认超时 600000ms（10 分钟）、总是发 SDK 事件的事件（SessionStart/Setup）、UserPromptSubmit 超时 30s 等。
 */
//@ chunk-63641kq7.js:5985-6066 fingerprint = ALWAYS_EMITTED_HOOK_EVENTS (1)
var TOOL_HOOK_EXECUTION_TIMEOUT_MS = 600000,
  ALWAYS_EMITTED_HOOK_EVENTS = ["SessionStart", "Setup"],
  USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS = 30000,
  Yhn = 6000,
  iKo = 30000,
  PQs = 5000;
/**
 * 钩子开始事件的占位实现（316 中为空函数）。
 */
//@ chunk-fe6rs39h.js:129512-129617 fingerprint = emitHookStarted (0.349)
async function emitHookStarted(e, n, s, r = {}) {
  if (!1)
    switch (w.state()) {
      case "started":
      case "cut":
      case "done":
      default:
    }
  return;
}

export {
  PQs,
  shouldEmitHookEvent,
  startHookProgressInterval,
  Yhn,
  TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
  TOOL_HOOK_EVENTS,
  emitHookResponse_2,
  TOOL_AND_BATCH_HOOK_EVENTS,
  iKo,
  emitHookStarted,
};
