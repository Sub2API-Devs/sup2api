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
import { che } from "./hookOutputParsing.js";
import { startHookProgressInterval } from "./hookEvents.js";
import { emitHookResponse } from "../../entrypoints/sdk/coreSchemas.js";
import { executeInBackground } from "../hooks.js";
import { errorMessage } from "../errors.js";
import { invalidateSessionEnvCache } from "../sessionEnvironment.js";
import { withDeadline } from "../sleep.js";
import { count } from "../collections.js";

/**
 * 登记一个后台 async 钩子：超时默认 15s（asyncTimeout 覆盖），启动进度上报，结束时由 checkForAsyncHookResponses 读取答复并持有。
 */
//@ chunk-e6aww6q8.js:941372-942117 fingerprint = registerPendingAsyncHook (0.902)
function registerPendingAsyncHook({
  processId: processId,
  hookId: hookId,
  asyncResponse: asyncResponse,
  hookName: hookName,
  hookEvent: hookEvent,
  command: command,
  shellCommand: shellCommand,
  toolName: toolName,
  pluginId: pluginId,
}) {
  let timeout = asyncResponse.asyncTimeout || 15000;
  logForDebugging(`Hooks: Registering async hook ${processId} (${hookName}) with timeout ${timeout}ms`);
  let q = che(),
    stopProgressInterval = startHookProgressInterval({
      hookId: hookId,
      hookName: hookName,
      hookEvent: hookEvent,
      getOutput: async () => {
        let taskOutput = q.get(processId)?.shellCommand.taskOutput;
        if (!taskOutput) return { stdout: "", stderr: "", output: "" };
        let stdout = await taskOutput.getStdout(),
          stderr = taskOutput.getStderr();
        return { stdout: stdout, stderr: stderr, output: stdout + stderr };
      },
    }),
    withResolvers = Promise.withResolvers(),
    withResolvers_2 = Promise.withResolvers(),
    we = {
      processId: processId,
      hookId: hookId,
      hookName: hookName,
      hookEvent: hookEvent,
      toolName: toolName,
      pluginId: pluginId,
      command: command,
      shellCommand: shellCommand,
      stopProgressInterval: stopProgressInterval,
      read: withResolvers.promise,
      readNow: withResolvers_2.resolve,
    };
  (q.register(we),
    checkForAsyncHookResponses(q, we, withResolvers_2.promise).then(withResolvers.resolve, () =>
      withResolvers.resolve(!1),
    ));
}
/**
 * 后台钩子结束：停止进度上报、清理进程并发出 SDK hook_response。
 */
//@ chunk-e6aww6q8.js:942117-942378 fingerprint = finalizeHook (1)
async function finalizeHook(hook, exitCode, outcome) {
  hook.stopProgressInterval();
  let { taskOutput: taskOutput } = hook.shellCommand,
    stdout = await taskOutput.getStdout(),
    stderr = taskOutput.getStderr();
  (hook.shellCommand.cleanup(),
    emitHookResponse({
      hookId: hook.hookId,
      hookName: hook.hookName,
      hookEvent: hook.hookEvent,
      output: stdout + stderr,
      stdout: stdout,
      stderr: stderr,
      exitCode: exitCode,
      outcome: outcome,
    }));
}
/**
 * 等后台钩子进程结束后读取答复：被杀视为取消；SessionStart 后台钩子完成会标记会话 env 过期。
 */
//@ chunk-e6aww6q8.js:943416-944085 callgraph-fingerprint = checkForAsyncHookResponses (0.305)
async function checkForAsyncHookResponses(e, n, r) {
  let { shellCommand: shellCommand } = n;
  try {
    if (
      (await shellCommand.result, await Promise.race([shellCommand.outputEnded, r]), e.get(n.processId) !== n)
    )
      return !1;
    if (shellCommand.status === "killed") return (await finalizeHook(n, 1, "cancelled"), !1);
    let h = await executeInBackground(n);
    if (h !== null && e.get(n.processId) === n) e.holdResponse(h);
    return ((e.isSessionEnvStale ||= n.hookEvent === "SessionStart"), !0);
  } catch (error) {
    return (
      logForDebugging(
        `Hooks: Failed to read ${n.processId} (${n.hookName}) at its end, so it is dropped: ${errorMessage(error)}`,
        { level: "error" },
      ),
      n.stopProgressInterval(),
      shellCommand.cleanup(),
      emitHookResponse({
        hookId: n.hookId,
        hookName: n.hookName,
        hookEvent: n.hookEvent,
        output: "",
        stdout: "",
        stderr: "",
        outcome: "error",
      }),
      !1
    );
  } finally {
    if (e.get(n.processId) === n) e.remove(n.processId);
  }
}
//@ chunk-e6aww6q8.js:944085-944152 placement
function RUt(e) {
  if (e.isSessionEnvStale) ((e.isSessionEnvStale = !1), invalidateSessionEnvCache());
}
/**
 * 判断 shell 命令对象是否已结束（completed 或 killed）。与 isTerminalTaskStatus 只是字符串相似，属于 shell 任务代码。
 */
//@ chunk-e6aww6q8.js:944152-944234 placement = isTerminalTaskStatus (0.851)
function isShellCommandSettled({ shellCommand: shellCommand }) {
  return shellCommand.status === "completed" || shellCommand.status === "killed";
}
//@ chunk-e6aww6q8.js:944234-944489 placement
async function checkForNewAsyncHookResponses() {
  let e = che();
  (await Promise.all(
    e
      .values()
      .filter(isShellCommandSettled)
      .map((r) => (r.readNow(), r.read)),
  ),
    RUt(e));
  let takeUndeliveredResponses = e.takeUndeliveredResponses();
  return (
    logForDebugging(
      `Hooks: checkForNewResponses returning ${takeUndeliveredResponses.length} responses, ${e.size()} hooks still pending`,
    ),
    takeUndeliveredResponses
  );
}
//@ chunk-e6aww6q8.js:944489-944501 placement
var rxo = 250;
/**
 * 结束前等待挂起的异步钩子完成，超出宽限期后放弃。
 */
//@ chunk-e6aww6q8.js:944501-945121 placement
async function settlePendingAsyncHooks({ hookEvent: hookEvent, graceMs: graceMs }) {
  let r = che(),
    filtered = r.values().filter((w) => w.hookEvent === hookEvent);
  if (filtered.length === 0) return { pending: 0, delivered: 0 };
  logForDebugging(
    `Hooks: Settling ${filtered.length} pending async ${hookEvent} hook(s), grace ${graceMs}ms`,
  );
  let h = !1;
  (await withDeadline(
    Promise.all(
      filtered.map(async (w) => {
        if ((await w.shellCommand.result.catch(() => {}), await withDeadline(w.read, rxo), !h))
          (w.readNow(), await w.read);
      }),
    ),
    graceMs,
  ),
    (h = !0));
  let filtered_2 = filtered.filter((w) => w.shellCommand.status === "completed");
  for (let w of filtered_2) w.readNow();
  let S = count(await Promise.all(filtered_2.map((w) => w.read)), (w) => w);
  return (
    RUt(r),
    logForDebugging(`Hooks: Settled ${S} of ${filtered.length} async ${hookEvent} hook(s) in-band`),
    { pending: filtered.length, delivered: S }
  );
}
//@ chunk-e6aww6q8.js:945121-945329 placement
async function cancelPendingAsyncHooks() {
  let e = che();
  (await Promise.all(
    e.values().map(async (n) => {
      if (isShellCommandSettled(n)) {
        (n.readNow(), await n.read);
        return;
      }
      (e.remove(n.processId), n.shellCommand.kill(), await finalizeHook(n, 1, "cancelled"));
    }),
  ),
    e.removeAll());
}
/**
 * 后台任务终止状态集合：failed/cancelled/killed/error。
 */
//@ chunk-18hwfzwa.js:1094902-1094959 fingerprint = finalizePendingAsyncHooks (0.568)
var finalizePendingAsyncHooks = new Set(["failed", "cancelled", "killed", "error"]);

export {
  cancelPendingAsyncHooks,
  finalizePendingAsyncHooks,
  settlePendingAsyncHooks,
  finalizeHook,
  registerPendingAsyncHook,
  checkForNewAsyncHookResponses,
};
