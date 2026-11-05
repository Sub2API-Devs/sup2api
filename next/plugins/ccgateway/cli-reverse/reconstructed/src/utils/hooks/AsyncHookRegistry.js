/**
 * utils/hooks/AsyncHookRegistry.ts
 *
 * 后台 async 钩子登记、进度上报与结束时读取答复。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/AsyncHookRegistry.ts
 * pieces: chunk-55y9c0xp.js (1), chunk-5xgkngpb.js (10), chunk-czq1j3j2.js (1)
 * attribution: placement 7, fingerprint 4, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../debug.js";
import {
  currentAsyncHookRegistryState,
  createHookJsonReader,
  findSyncJsonAnswer,
  parseAsyncHookOutput,
  hasUnparsedJsonLine,
} from "./hookOutputParsing.js";
import { startHookProgressInterval } from "./hookEvents.js";
import { emitHookResponse } from "../../entrypoints/sdk/coreSchemas.js";
import { jsonStringify } from "../slowOperations.js";
import { restrictHookOutputForMcpInbound, getHookMessageTexts } from "./hookEventHelpers.js";
import { errorMessage } from "../errors.js";
import { removeClaudeCodeHintLines } from "../claudeCodeHints.js";
import { RESULT_LIMIT_COUNT } from "../../constants/outputLimits.js";
import { truncateToLength } from "../stringUtils.js";
import { invalidateSessionEnvCache } from "../sessionEnvironment.js";
import { countWhere } from "../collections.js";
import { withDeadline } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:952656-953479 fingerprint (2.1.88 match: registerPendingAsyncHook, 0.855)
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
  typeLabel,
  shellCommand,
  toolName,
  pluginId,
  plainOutputIsContext,
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
    typeLabel,
    shellCommand,
    stopProgressInterval,
    read: deferred.promise,
    readNow: deferred_2.resolve,
    plainOutputIsContext,
  };
  state.register(entry);
  readFinishedAsyncHook(state, entry, deferred_2.promise).then(deferred.resolve, () =>
    deferred.resolve(false),
  );
}
//@ chunk-5xgkngpb.js:953479-953740 fingerprint (2.1.88 match: finalizeHook, 1)
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
//@ chunk-5xgkngpb.js:953740-955137 fingerprint (2.1.88 match: checkForAsyncHookResponses, 0.385)
/**
 * 后台 async 钩子结束后读取 stdout：解析 {async:true} 之后的 JSON 答复，finalize 并返回附件数据；无输出且成功时返回 null。
 */
async function checkForAsyncHookResponses(hook) {
  let { shellCommand } = hook;
  let stdout = await shellCommand.taskOutput.getStdout();
  let stderr = shellCommand.taskOutput.getStderr();
  let { code } = await shellCommand.result;
  let answer = {};
  let emptyAnswer = true;
  let suppressOutput = false;
  try {
    let hookJsonReader = createHookJsonReader();
    let syncJsonAnswer = findSyncJsonAnswer(stdout, hookJsonReader);
    if (syncJsonAnswer !== undefined) {
      logForDebugging(`Hooks: Found sync response from ${hook.processId}: ${jsonStringify(syncJsonAnswer)}`);
      let asyncHookOutput = parseAsyncHookOutput(syncJsonAnswer, hook.hookName);
      emptyAnswer = Object.keys(asyncHookOutput).length === 0;
      suppressOutput = asyncHookOutput.suppressOutput === true;
      answer = restrictHookOutputForMcpInbound(asyncHookOutput);
    } else if (hasUnparsedJsonLine(stdout, hookJsonReader))
      logForDebugging(
        `Hooks: async hook ${hook.processId} (${hook.hookName}) printed a stdout line that begins with { but no JSON answer could be read. After any {"async":true} line, print one JSON object and nothing else, or put the object on one line.`,
        {
          level: "error",
        },
      );
  } catch (error) {
    logForDebugging(
      `Hooks: Failed to read the JSON answer of ${hook.processId} (${hook.hookName}), so it is dropped: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  let plainText = hook.plainOutputIsContext ? removeClaudeCodeHintLines(stdout).trim() : "";
  let usePlainText =
    getHookMessageTexts(answer).length === 0 &&
    !suppressOutput &&
    code === 0 &&
    plainText !== "" &&
    !plainText.startsWith("{");
  if (usePlainText) {
    emptyAnswer = false;
    answer = {
      ...answer,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          plainText.length <= RESULT_LIMIT_COUNT
            ? plainText
            : `${truncateToLength(plainText, RESULT_LIMIT_COUNT)}
[The hook printed more than is shown here.]`,
      },
    };
  }
  await finalizeHook(hook, code, code === 0 ? "success" : "error");
  if (emptyAnswer && code === 0 && !stderr.trim()) {
    logForDebugging(
      `Hooks: ${hook.processId} (${hook.hookName}) produced no response payload \u2014 skipping attachment`,
    );
    return null;
  }
  return {
    processId: hook.processId,
    response: answer,
    hookName: hook.hookName,
    hookEvent: hook.hookEvent,
    toolName: hook.toolName,
    pluginId: hook.pluginId,
    command: hook.command,
    typeLabel: hook.typeLabel,
    stdout: usePlainText ? truncateToLength(stdout, RESULT_LIMIT_COUNT) : stdout,
    stderr,
    exitCode: code,
    ...(usePlainText && {
      isPlainOutput: usePlainText,
    }),
  };
}
//@ chunk-5xgkngpb.js:955137-955806 layout
/**
 * 等后台钩子进程结束后读取答复：被杀视为取消；SessionStart 后台钩子完成会标记会话 env 过期。
 */
async function readFinishedAsyncHook(state, hook, promise) {
  let { shellCommand } = hook;
  try {
    await shellCommand.result;
    await Promise.race([shellCommand.outputEnded, promise]);
    if (state.get(hook.processId) !== hook) return false;
    if (shellCommand.status === "killed") {
      await finalizeHook(hook, 1, "cancelled");
      return false;
    }
    let response = await checkForAsyncHookResponses(hook);
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
//@ chunk-5xgkngpb.js:955806-955873 placement
function refreshStaleSessionEnv(state) {
  if (state.isSessionEnvStale) {
    state.isSessionEnvStale = false;
    invalidateSessionEnvCache();
  }
}
//@ chunk-5xgkngpb.js:955873-955955 placement (2.1.88 match: isTerminalTaskStatus, 0.852)
/**
 * 判断 shell 命令对象是否已结束（completed 或 killed）。与 isTerminalTaskStatus 只是字符串相似，属于 shell 任务代码。
 */
function isShellCommandSettled({ shellCommand: status }) {
  return status.status === "completed" || status.status === "killed";
}
//@ chunk-5xgkngpb.js:955955-956264 placement
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
  state.plainOutputs.polled += countWhere(responses, (hook) => hook.isPlainOutput === true);
  logForDebugging(
    `Hooks: checkForNewResponses returning ${responses.length} responses, ${state.size()} hooks still pending`,
  );
  return responses;
}
//@ chunk-5xgkngpb.js:956264-956276 placement
var ASYNC_HOOK_FINALIZE_GRACE_MS = 250;
//@ chunk-5xgkngpb.js:956276-956896 placement
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
  let delivered = countWhere(
    await Promise.all(filtered_2.map((entry) => entry.read)),
    (delivered) => delivered,
  );
  refreshStaleSessionEnv(state);
  logForDebugging(`Hooks: Settled ${delivered} of ${filtered.length} async ${hookEvent} hook(s) in-band`);
  return {
    pending: filtered.length,
    delivered,
  };
}
//@ chunk-5xgkngpb.js:956896-957104 placement
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
//@ chunk-55y9c0xp.js:191-231 placement
/**
 * “找不到该 ID 的 hook 回调”错误文案。
 */
var NO_HOOK_CALLBACK_MESSAGE = "No hook callback found for ID";
//@ chunk-czq1j3j2.js:1128938-1128995 fingerprint (2.1.88 match: finalizePendingAsyncHooks, 0.567)
/**
 * 后台任务终止状态集合：failed/cancelled/killed/error。
 */
var finalizePendingAsyncHooks; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1128938", () => {
  finalizePendingAsyncHooks = new Set(["failed", "cancelled", "killed", "error"]);
});
export {
  cancelPendingAsyncHooks,
  NO_HOOK_CALLBACK_MESSAGE,
  checkForNewAsyncHookResponses,
  settlePendingAsyncHooks,
  registerPendingAsyncHook,
  finalizePendingAsyncHooks,
};
