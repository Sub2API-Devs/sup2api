/**
 * plugins/functionHooks/processApi.ts
 *
 * 2.1.316 新增：插件 $.process.run/spawn 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { resolve as resolve_2 } from "path";
import {
  killIfUnchanged,
  killProcessGroup as killProcessGroup_2,
} from "../../utils/auth/lockHolderLiveness.js";
import { processStartTokens } from "../../utils/processIdentity.js";
import { sleep } from "../../utils/sleep.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import { buildSafeGitInvocation } from "../../utils/git/gitSafeInvocation.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { getCwd } from "../../utils/cwd.js";
import { MAX_PROCESS_TIMEOUT_MS } from "./panes.js";
import { createTimeoutController } from "./httpApi.js";
import { prefixedErrorCtor } from "./modelApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { HooksError } from "./hooksErrors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { surfaceComposer } from "./surfaceBinding.js";

//@ chunk-e6aww6q8.js:3986460-3986929 placement
/**
 * 收集子进程输出流至多 n 字节，结束时返回 {text, isTruncated}。
 */
function collectStreamCapped(stream, maxBytes) {
  if (!(stream !== null && stream !== undefined))
    return Promise.resolve({
      text: "",
      isTruncated: false,
    });
  return new Promise((resolve) => {
    let chunks = [];
    let totalBytes = 0;
    let isTruncated = false;
    function onData(chunk) {
      let room = maxBytes - totalBytes;
      let overflows = chunk.byteLength > room;
      if (overflows) isTruncated = true;
      if (room <= 0) return;
      let kept = overflows ? chunk.subarray(0, room) : chunk;
      chunks.push(kept);
      totalBytes += kept.byteLength;
    }
    function finish() {
      stream?.off("data", onData);
      let buffer = Buffer.concat(chunks);
      resolve({
        text: isTruncated
          ? new TextDecoder().decode(buffer, {
              stream: true,
            })
          : buffer.toString("utf8"),
        isTruncated,
      });
    }
    stream?.on("data", onData);
    stream?.once("end", finish);
    stream?.once("error", finish);
    stream?.once("close", finish);
  });
}
//@ chunk-e6aww6q8.js:3986929-3986973 placement
/**
 * 销毁所有流
 */
function destroyStreams(streams) {
  for (let stream of streams) stream?.destroy();
}
//@ chunk-e6aww6q8.js:3986973-3986985 placement
/**
 * 500
 */
var KILL_GRACE_POLL_MS = 500;
//@ chunk-e6aww6q8.js:3986985-3986998 placement
/**
 * 2000
 */
var DEFAULT_KILL_GRACE_MS = 2000;
//@ chunk-e6aww6q8.js:3986998-3987046 placement (2.1.88 match: killCaffeinate, 0.805)
function killCaffeinate(processTokens, streams, done) {
  killIfUnchanged(processTokens, "SIGKILL");
  destroyStreams(streams);
  done();
}
//@ chunk-e6aww6q8.js:3987046-3987372 placement
/**
 * 结束插件子进程：对进程组发 SIGTERM，等待宽限期或关闭事件后强制清理剩余进程与流。
 */
function terminateProcessTree(child, { streams, done, graceMs = DEFAULT_KILL_GRACE_MS }) {
  let { pid } = child;
  if (pid === undefined || child.exitCode !== null || child.signalCode !== null) {
    destroyStreams(streams);
    return;
  }
  let promise = new Promise((resolve) => {
    child.once("close", () => resolve());
  });
  return killProcessGroup_2(pid, "SIGTERM")
    .then((pids) => processStartTokens([pid, ...pids]))
    .then(async (tokenSet) => {
      let graceTimer = sleep(graceMs, undefined, {
        unref: true,
      });
      await (tokenSet.size <= 1 ? Promise.race([graceTimer, promise]) : graceTimer);
      killCaffeinate(tokenSet, streams, done);
    });
}
//@ chunk-e6aww6q8.js:3987372-3987388 placement
/**
 * 4194304
 */
var MAX_COLLECTED_OUTPUT_BYTES = 4194304;
//@ chunk-e6aww6q8.js:3987421-3987445 placement
/**
 * "$.process.run"
 */
var PROCESS_RUN_LABEL = "$.process.run";
//@ chunk-e6aww6q8.js:3987445-3987459 placement
/**
 * 30000
 */
var DEFAULT_PROCESS_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:3987459-3987715 placement
/**
 * 以插件身份启动子进程：合并环境变量（检查 Bun 选项）、git 命令走安全调用，放入插件 cgroup，stdout/stderr 管道。
 */
function spawnPluginProcess({ command, args, cwd, env, hasInput, pluginId }) {
  let baseEnv = subprocessEnv();
  let mergedEnv = {
    ...baseEnv,
    ...env,
  };
  checkPluginBunOptions(pluginId, mergedEnv, baseEnv);
  let safeGitInvocation = buildSafeGitInvocation(command, args, mergedEnv);
  return safeSpawn(command, safeGitInvocation?.args ?? args, {
    cwd,
    env: safeGitInvocation?.env ?? mergedEnv,
    extendEnv: false,
    stdin: hasInput ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
    toolCgroupClass: "plugin",
  });
}
//@ chunk-e6aww6q8.js:3987715-3987803 placement
/**
 * 启动失败说明
 */
function spawnFailureText(error) {
  let errnoCode = getErrnoCode(error);
  let message = errorMessage(error);
  return `failed to start: ${errnoCode === undefined ? message : `${errnoCode}: ${message}`}`;
}
//@ chunk-e6aww6q8.js:3987803-3989180 placement
/**
 * 插件 $.process.spawn：启动长期子进程并转发事件。
 */
async function processSpawnForPlugin({ argv, init }, pluginName, { signal, cwd: baseCwd, pluginId } = {}) {
  let [command = "", ...spawnArgs] = argv;
  let startCwd = baseCwd ?? getCwd();
  let cwd = init?.cwd === undefined ? startCwd : resolve_2(startCwd, init.cwd);
  let min = Math.min(init?.timeoutMs ?? DEFAULT_PROCESS_TIMEOUT_MS, MAX_PROCESS_TIMEOUT_MS);
  let logLabel = `${PROCESS_RUN_LABEL} (${pluginName})`;
  let timeoutController = createTimeoutController(signal, min);
  let now = Date.now();
  let failWith = prefixedErrorCtor(pluginName, PROCESS_RUN_LABEL, command);
  let isAborted = false;
  let done = () => {
    return;
  };
  let promise = new Promise((resolve) => {
    done = () => resolve(undefined);
  });
  try {
    let onAbort = function () {
      if (
        terminateProcessTree(child, {
          streams,
          done,
        }) !== undefined
      )
        isAborted = true;
    };
    let child = spawnPluginProcess({
      command,
      args: spawnArgs,
      cwd,
      env: init?.env,
      hasInput: init?.stdin !== undefined,
      pluginId,
    });
    let streams = [child.stdout, child.stderr];
    logForDebugging(
      `${logLabel}: ${command} with ${spawnArgs.length} args in ${cwd} (pid ${child.pid ?? "?"})`,
    );
    let promise_2 = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode) => resolve(exitCode ?? 1));
    });
    promise_2.catch(() => {});
    timeoutController.controller.signal.addEventListener("abort", onAbort, {
      once: true,
    });
    if (timeoutController.controller.signal.aborted) onAbort();
    if (init?.stdin !== undefined && child.stdin !== null) {
      child.stdin.once("error", () => {});
      child.stdin.end(init.stdin);
    }
    let winner = await Promise.race([
      Promise.all([
        collectStreamCapped(child.stdout, MAX_COLLECTED_OUTPUT_BYTES),
        collectStreamCapped(child.stderr, MAX_COLLECTED_OUTPUT_BYTES),
        promise_2,
      ]),
      promise,
    ]);
    let isAbortedResult = winner === undefined || isAborted;
    if (isAbortedResult && timeoutController.timedOut())
      throw failWith(`aborted: still running after ${min}ms`);
    if (isAbortedResult) throw failWith("aborted");
    let [stdoutResult, stderrResult, exitCode] = winner;
    logForDebugging(
      `${logLabel}: ${command} exited ${exitCode} in ${Date.now() - now}ms, ${stdoutResult.text.length} + ${stderrResult.text.length} chars`,
    );
    return {
      exitCode,
      stdout: stdoutResult.text,
      stderr: stderrResult.text,
      isStdoutTruncated: stdoutResult.isTruncated,
      isStderrTruncated: stderrResult.isTruncated,
    };
  } catch (error) {
    if (error instanceof HooksError) throw error;
    let failureText = spawnFailureText(error);
    logForDebugging(`${logLabel}: ${command} ${failureText}`, {
      level: "warn",
    });
    throw failWith(failureText);
  } finally {
    timeoutController.release();
  }
}
//@ chunk-e6aww6q8.js:3989213-3989229 placement
/**
 * 1048576
 */
var MAX_SPAWN_OUTPUT_BYTES = 1048576;
//@ chunk-e6aww6q8.js:3989229-3989255 placement
/**
 * "$.process.spawn"
 */
var PROCESS_SPAWN_LABEL = "$.process.spawn";
//@ chunk-e6aww6q8.js:3989255-3991045 placement
/**
 * 插件 $.process.run：运行子进程并收集输出，支持中止。
 */
async function* processRunForPlugin(
  { argv, cwd, env, input },
  pluginName,
  { signal, cwd: baseCwd, pluginId } = {},
) {
  let [command = "", ...spawnArgs] = argv;
  let startCwd = baseCwd ?? getCwd();
  let resolvedCwd = cwd === undefined ? startCwd : resolve_2(startCwd, cwd);
  let logLabel = `${PROCESS_SPAWN_LABEL} (${pluginName})`;
  let now = Date.now();
  let failWith = prefixedErrorCtor(pluginName, PROCESS_SPAWN_LABEL, command);
  let queue = [];
  let queuedBytes = 0;
  let isPaused = false;
  let chunkCount = 0;
  let wakeWaiter;
  function enqueue(queuedItem) {
    queue.push(queuedItem);
    wakeWaiter?.();
  }
  function toFailure(error) {
    let failureText = spawnFailureText(error);
    logForDebugging(`${logLabel}: ${command} ${failureText}`, {
      level: "warn",
    });
    return failWith(failureText);
  }
  if (signal?.aborted === true) throw failWith("aborted");
  let child;
  try {
    child = spawnPluginProcess({
      command,
      args: spawnArgs,
      cwd: resolvedCwd,
      env,
      hasInput: input !== undefined,
      pluginId,
    });
  } catch (error) {
    throw toFailure(error);
  }
  let streams = [child.stdout, child.stderr];
  let termination;
  let isTerminating = false;
  function terminate(graceMs) {
    if (!isTerminating) {
      isTerminating = true;
      termination = terminateProcessTree(child, {
        streams,
        done: () => {},
        graceMs,
      });
    }
    return termination;
  }
  let releaseCleanup = registerCleanup(async () => {
    await terminate(KILL_GRACE_POLL_MS);
  });
  logForDebugging(
    `${logLabel}: ${command} with ${spawnArgs.length} args in ${resolvedCwd} (pid ${child.pid ?? "?"})`,
  );
  function setPaused(shouldPause) {
    isPaused = !shouldPause;
    for (let stream of streams)
      if (shouldPause) stream?.resume();
      else stream?.pause();
  }
  function watchStream(sink, stream) {
    sink?.setEncoding("utf8");
    sink?.on("data", (text) => {
      if (text === "") return;
      queuedBytes += text.length;
      enqueue({
        stream,
        text,
      });
      if (queuedBytes > MAX_SPAWN_OUTPUT_BYTES && !isPaused) setPaused(false);
    });
    sink?.once("error", () => {});
  }
  watchStream(child.stdout, "stdout");
  watchStream(child.stderr, "stderr");
  child.once("error", (error) =>
    enqueue({
      failed: toFailure(error),
    }),
  );
  child.once("close", (code, signal) =>
    enqueue({
      ended: {
        code,
        signal,
      },
    }),
  );
  function onAbort() {
    let shouldTerminate = !isTerminating && terminate() !== undefined;
    queue.length = 0;
    enqueue({
      failed: failWith("aborted"),
    });
    if (shouldTerminate) logForDebugging(`${logLabel}: ${command} stopped: the op was aborted`);
  }
  signal?.addEventListener("abort", onAbort, {
    once: true,
  });
  if (input !== undefined && child.stdin !== null) {
    child.stdin.once("error", () => {});
    child.stdin.end(input);
  }
  try {
    while (true) {
      let nextItem = queue.shift();
      if (nextItem === undefined) {
        await new Promise((resolve) => {
          wakeWaiter = resolve;
        });
        wakeWaiter = undefined;
        continue;
      }
      if ("failed" in nextItem) throw nextItem.failed;
      if ("ended" in nextItem) {
        let { ended } = nextItem;
        logForDebugging(
          `${logLabel}: ${command} ended (${ended.code ?? ended.signal}) in ${Date.now() - now}ms, ${chunkCount} chunks`,
        );
        return ended;
      }
      queuedBytes -= nextItem.text.length;
      chunkCount += 1;
      if (isPaused && queuedBytes <= MAX_SPAWN_OUTPUT_BYTES) setPaused(true);
      yield nextItem;
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    releaseCleanup();
    if (!isTerminating && terminate() !== undefined)
      logForDebugging(`${logLabel}: ${command} stopped after ${Date.now() - now}ms: the stream was let go`);
  }
}
//@ chunk-e6aww6q8.js:3991045-3991103 placement
/**
 * 装饰段未变或文本相同
 */
var decorationsUnchanged = (promptBox, promptBoxForPlugin) =>
  promptBox.decorations.length === 0 || promptBoxForPlugin?.text === promptBox.text;
//@ chunk-e6aww6q8.js:3991103-3991212 placement
/**
 * $.prompt.paint：在当前绑定的输入框上绘制装饰段，无输入框时返回 {isPainted: false}。
 */
async function promptPaintOp(box, plugin) {
  let composer = surfaceComposer();
  if (composer === undefined)
    return {
      isPainted: false,
    };
  return composer.paint(plugin, box.decorations, box.text);
}
export { decorationsUnchanged, promptPaintOp, processSpawnForPlugin, processRunForPlugin };
