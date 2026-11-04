/**
 * utils/hooks/AsyncHookRegistry.ts
 *
 * 后台 async 钩子登记、进度上报与结束时读取答复。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/AsyncHookRegistry.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-e6aww6q8.js (9)
 * attribution: fingerprint 3, callgraph-fingerprint 1, placement 6
 */
import { logForDebugging } from "../debug.js";
import { currentAsyncHookRegistryState } from "./hookOutputParsing.js";
import { startHookProgressInterval } from "./hookEvents.js";
import { emitHookResponse } from "../../entrypoints/sdk/coreSchemas.js";
import { executeInBackground } from "../hooks.js";
import { errorMessage } from "../errors.js";
import { invalidateSessionEnvCache } from "../sessionEnvironment.js";
import { withDeadline } from "../sleep.js";
import { count } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:941372-942117 fingerprint = registerPendingAsyncHook (0.902)
/**
 * 登记一个后台 async 钩子：超时默认 15s（asyncTimeout 覆盖），启动进度上报，结束时由 checkForAsyncHookResponses 读取答复并持有。
 */
function registerPendingAsyncHook({
  processId,
  hookId,
  asyncResponse,
  hookName,
  hookEvent,
  command,
  shellCommand,
  toolName,
  pluginId,
}) {
  let timeout = asyncResponse.asyncTimeout || 15000;
  logForDebugging(`Hooks: Registering async hook ${processId} (${hookName}) with timeout ${timeout}ms`);
  let state = currentAsyncHookRegistryState();
  let stopProgressInterval = startHookProgressInterval({
    hookId,
    hookName,
    hookEvent,
    getOutput: async () => {
      let taskOutput = state.get(processId)?.shellCommand.taskOutput;
      if (!taskOutput)
        return {
          stdout: "",
          stderr: "",
          output: "",
        };
      let stdout = await taskOutput.getStdout();
      let stderr = taskOutput.getStderr();
      return {
        stdout,
        stderr,
        output: stdout + stderr,
      };
    },
  });
  let deferred = Promise.withResolvers();
  let deferred_2 = Promise.withResolvers();
  let entry = {
    processId,
    hookId,
    hookName,
    hookEvent,
    toolName,
    pluginId,
    command,
    shellCommand,
    stopProgressInterval,
    read: deferred.promise,
    readNow: deferred_2.resolve,
  };
  state.register(entry);
  checkForAsyncHookResponses(state, entry, deferred_2.promise).then(deferred.resolve, () =>
    deferred.resolve(false),
  );
}
//@ chunk-e6aww6q8.js:942117-942378 fingerprint = finalizeHook (1)
/**
 * 后台钩子结束：停止进度上报、清理进程并发出 SDK hook_response。
 */
async function finalizeHook(hook, exitCode, outcome) {
  hook.stopProgressInterval();
  let { taskOutput } = hook.shellCommand;
  let stdout = await taskOutput.getStdout();
  let stderr = taskOutput.getStderr();
  hook.shellCommand.cleanup();
  emitHookResponse({
    hookId: hook.hookId,
    hookName: hook.hookName,
    hookEvent: hook.hookEvent,
    output: stdout + stderr,
    stdout,
    stderr,
    exitCode,
    outcome,
  });
}
//@ chunk-e6aww6q8.js:943416-944085 callgraph-fingerprint = checkForAsyncHookResponses (0.305)
/**
 * 等后台钩子进程结束后读取答复：被杀视为取消；SessionStart 后台钩子完成会标记会话 env 过期。
 */
async function checkForAsyncHookResponses(state, hook, promise) {
  let { shellCommand } = hook;
  try {
    await shellCommand.result;
    await Promise.race([shellCommand.outputEnded, promise]);
    if (state.get(hook.processId) !== hook) return false;
    if (shellCommand.status === "killed") {
      await finalizeHook(hook, 1, "cancelled");
      return false;
    }
    let response = await executeInBackground(hook);
    if (response !== null && state.get(hook.processId) === hook) state.holdResponse(response);
    state.isSessionEnvStale ||= hook.hookEvent === "SessionStart";
    return true;
  } catch (error) {
    logForDebugging(
      `Hooks: Failed to read ${hook.processId} (${hook.hookName}) at its end, so it is dropped: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    hook.stopProgressInterval();
    shellCommand.cleanup();
    emitHookResponse({
      hookId: hook.hookId,
      hookName: hook.hookName,
      hookEvent: hook.hookEvent,
      output: "",
      stdout: "",
      stderr: "",
      outcome: "error",
    });
    return false;
  } finally {
    if (state.get(hook.processId) === hook) state.remove(hook.processId);
  }
}
//@ chunk-e6aww6q8.js:944085-944152 placement
function refreshStaleSessionEnv(state) {
  if (state.isSessionEnvStale) {
    state.isSessionEnvStale = false;
    invalidateSessionEnvCache();
  }
}
//@ chunk-e6aww6q8.js:944152-944234 placement = isTerminalTaskStatus (0.851)
/**
 * 判断 shell 命令对象是否已结束（completed 或 killed）。与 isTerminalTaskStatus 只是字符串相似，属于 shell 任务代码。
 */
function isShellCommandSettled({ shellCommand: status }) {
  return status.status === "completed" || status.status === "killed";
}
//@ chunk-e6aww6q8.js:944234-944489 placement
async function checkForNewAsyncHookResponses() {
  let state = currentAsyncHookRegistryState();
  await Promise.all(
    state
      .values()
      .filter(isShellCommandSettled)
      .map((entry) => {
        entry.readNow();
        return entry.read;
      }),
  );
  refreshStaleSessionEnv(state);
  let responses = state.takeUndeliveredResponses();
  logForDebugging(
    `Hooks: checkForNewResponses returning ${responses.length} responses, ${state.size()} hooks still pending`,
  );
  return responses;
}
//@ chunk-e6aww6q8.js:944489-944501 placement
var ASYNC_HOOK_FINALIZE_GRACE_MS = 250;
//@ chunk-e6aww6q8.js:944501-945121 placement
/**
 * 结束前等待挂起的异步钩子完成，超出宽限期后放弃。
 */
async function settlePendingAsyncHooks({ hookEvent, graceMs }) {
  let state = currentAsyncHookRegistryState();
  let filtered = state.values().filter((entry) => entry.hookEvent === hookEvent);
  if (filtered.length === 0)
    return {
      pending: 0,
      delivered: 0,
    };
  logForDebugging(
    `Hooks: Settling ${filtered.length} pending async ${hookEvent} hook(s), grace ${graceMs}ms`,
  );
  let settled = false;
  await withDeadline(
    Promise.all(
      filtered.map(async (entry) => {
        await entry.shellCommand.result.catch(() => {});
        await withDeadline(entry.read, ASYNC_HOOK_FINALIZE_GRACE_MS);
        if (!settled) {
          entry.readNow();
          await entry.read;
        }
      }),
    ),
    graceMs,
  );
  settled = true;
  let filtered_2 = filtered.filter((entry) => entry.shellCommand.status === "completed");
  for (let entry of filtered_2) entry.readNow();
  let delivered = count(await Promise.all(filtered_2.map((entry) => entry.read)), (delivered) => delivered);
  refreshStaleSessionEnv(state);
  logForDebugging(`Hooks: Settled ${delivered} of ${filtered.length} async ${hookEvent} hook(s) in-band`);
  return {
    pending: filtered.length,
    delivered,
  };
}
//@ chunk-e6aww6q8.js:945121-945329 placement
async function cancelPendingAsyncHooks() {
  let state = currentAsyncHookRegistryState();
  await Promise.all(
    state.values().map(async (entry) => {
      if (isShellCommandSettled(entry)) {
        entry.readNow();
        await entry.read;
        return;
      }
      state.remove(entry.processId);
      entry.shellCommand.kill();
      await finalizeHook(entry, 1, "cancelled");
    }),
  );
  state.removeAll();
}
//@ chunk-18hwfzwa.js:1094902-1094959 fingerprint = finalizePendingAsyncHooks (0.568)
/**
 * 后台任务终止状态集合：failed/cancelled/killed/error。
 */
var finalizePendingAsyncHooks; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1094902", () => {
  finalizePendingAsyncHooks = new Set(["failed", "cancelled", "killed", "error"]);
});
export {
  cancelPendingAsyncHooks,
  finalizePendingAsyncHooks,
  settlePendingAsyncHooks,
  finalizeHook,
  registerPendingAsyncHook,
  checkForNewAsyncHookResponses,
};
