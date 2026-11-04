/**
 * utils/execFileNoThrow.ts
 *
 * 不抛异常地执行 git/git diff 子进程并返回输出（316 中这几个函数都固定执行 git）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/execFileNoThrow.ts
 * pieces: chunk-s61vbvea.js (1), chunk-sycgf9xs.js (26)
 * attribution: fingerprint 2, affinity 4, facade-exports 4, layout 1, sole-consumer 16
 */
import { basename } from "path";
import { constants } from "buffer";
import { slowLogging, jsonStringifyRaw } from "./slowOperations.js";
import { safeExecShellSync } from "./safeSpawn.js";
import { getCwdIfAvailable } from "./cwd.js";
import { isDisklessSession, DISKLESS_PROGRAM_REFUSAL } from "./disklessSession.js";
import { logError } from "./log.js";
import { toError, getErrnoCode, isSyscallError, withTelemetryMessage, shortErrorStack } from "./errors.js";
import { withDeadline } from "./sleep.js";
import { STALE_CONNECTION_ERROR_CODES } from "../services/api/withRetry.js";
import { buildSafeGitInvocation } from "./git/gitSafeInvocation.js";
import { env } from "./env.js";
import { isGitMissingMessageSupported, GIT_MISSING_MAC_MESSAGE } from "./git/gitMissingMessage.js";
import { GitStartFolderError, buildGitInvocation, CLAUDE_CODE_FOUND_REPOSITORY_GIT } from "./gitSafeExec.js";
import { logForDebugging } from "./debug.js";
import { getPlatform } from "./platform.js";
import { isCleanupStarted, registerCleanup } from "./cleanupRegistry.js";
import { execa } from "../../vendor/execa/index.js";
import { cgroupSpawnOptions } from "./toolCgroup.js";
import { onExit } from "../../vendor/signal-exit/dist/mjs/index.js";
import { gitExe } from "./git.js";
import { SAFE_GIT_REPO_ARGS, GIT_CONFIG_PARAMETERS_LIMIT } from "./git/gitSafeEnv.js";

//@ chunk-sycgf9xs.js:13305-13323 affinity
var MS_PER_SECOND = 1000;
var SECONDS_PER_MINUTE_2 = 60;
//@ chunk-sycgf9xs.js:13323-13686 facade-exports = execSyncWithDefaults_DEPRECATED (0.916)
/**
 * 同步执行 shell 命令（默认 10 分钟超时、1MB 输出），失败或无输出返回 null。
 */
function execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
  command,
  {
    abortSignal,
    timeout: timeoutMs = 10 * SECONDS_PER_MINUTE_2 * MS_PER_SECOND,
    input,
    stdio = ["ignore", "pipe", "pipe"],
    useToolMemoryCgroup,
  } = {},
) {
  abortSignal?.throwIfAborted();
  using guard = slowLogging`exec: ${command.slice(0, 200)}`;
  try {
    let result = safeExecShellSync(command, {
      env: process.env,
      maxBuffer: 1e6,
      timeout: timeoutMs,
      cwd: getCwdIfAvailable(),
      stdio,
      reject: false,
      input,
      useToolMemoryCgroup,
    });
    if (!result.stdout) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}
//@ chunk-sycgf9xs.js:13686-13724 facade-exports
var SECONDS_PER_MS = 1000;
var SECONDS_PER_MINUTE = 60;
var INHERITED_FD_PATH = "/proc/self/fd/3";
//@ chunk-sycgf9xs.js:13724-14358 facade-exports
/**
 * execFileNoThrow：执行外部程序且从不抛错，返回 {stdout, stderr, code, error}。默认超时 10 分钟、保留出错输出、cwd 取当前会话目录（Tv() 为真时不设）；其余选项（abortSignal、env、stdin、cgroup、inheritFd、git 钩子/终端提示开关等）原样转给 execFileNoThrowWithCwd。
 */
function execFileNoThrow(
  command,
  args,
  options = {
    timeout: 10 * SECONDS_PER_MINUTE * SECONDS_PER_MS,
    preserveOutputOnError: true,
    useCwd: true,
  },
) {
  return catchExecError(() =>
    execFileNoThrowWithCwd(command, args, {
      allowRepoGitHooks: options.allowRepoGitHooks,
      allowGitTerminalPrompt: options.allowGitTerminalPrompt,
      abortSignal: options.abortSignal,
      timeout: options.timeout,
      preserveOutputOnError: options.preserveOutputOnError,
      cwd: options.cwd ?? (options.useCwd && !isDisklessSession() ? getCwdIfAvailable() : undefined),
      env: options.env,
      extendEnv: options.extendEnv,
      stdin: options.stdin,
      input: options.input,
      stdout: options.stdout,
      stderr: options.stderr,
      maxBuffer: options.maxBuffer,
      stripFinalNewline: options.stripFinalNewline,
      useToolMemoryCgroup: options.useToolMemoryCgroup,
      toolCgroupClass: options.toolCgroupClass,
      waitForExitAfterKill: options.waitForExitAfterKill,
      inheritFd: options.inheritFd,
      gitStartsIn: options.gitStartsIn,
    }),
  );
}
//@ chunk-sycgf9xs.js:14358-14470 layout
async function catchExecError(error) {
  try {
    return await error();
  } catch (error) {
    logError(error);
    return {
      stdout: "",
      stderr: "",
      code: 1,
      error: toError(error).message,
    };
  }
}
//@ chunk-sycgf9xs.js:14470-14533 facade-exports
/**
 * execFileNoThrowWithCwd：execFileNoThrow 的底层，按是否给出选项调用实际的 spawn 实现，并包一层同步异常转结果。
 */
function execFileNoThrowWithCwd(file, args, options) {
  return catchExecError(() =>
    options === undefined ? execFileCore(file, args) : execFileCore(file, args, options),
  );
}
//@ chunk-sycgf9xs.js:14533-14602 affinity = stopRecording (0.781)
/**
 * 向进程组（-pid）发 SIGTERM；pid ≤ 1 时不做，错误忽略。旧版名 stopRecording 是错配。
 */
function killProcessGroup(pid) {
  if (pid <= 1) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {}
}
//@ chunk-sycgf9xs.js:14602-14622 affinity
var ABORT_KILL_GRACE_MS = 6000;
var PIPE_DESTROY_DELAY_MS = 2000;
//@ chunk-sycgf9xs.js:14622-14854 affinity
/**
 * 监听 abort：触发时杀掉子进程所在进程组，并在一段时间后销毁 stdout/stderr 管道，防止孙进程持有管道导致挂起。返回解除监听的函数。
 */
function killProcessGroupOnAbort(timeoutMs, pid, abortSignal) {
  let timer;
  let onAbort = () => {
    killProcessGroup(pid);
    timer = setTimeout(
      ({ stdout, stderr }) => {
        stdout?.destroy();
        stderr?.destroy();
      },
      PIPE_DESTROY_DELAY_MS,
      timeoutMs,
    );
  };
  if (abortSignal.aborted) onAbort();
  else
    abortSignal.addEventListener("abort", onAbort, {
      once: true,
    });
  return () => {
    abortSignal.removeEventListener("abort", onAbort);
    clearTimeout(timer);
  };
}
//@ chunk-sycgf9xs.js:14854-14866 sole-consumer
var ABORT_GRACEFUL_MS = 5000;
//@ chunk-sycgf9xs.js:14866-15285 sole-consumer
/**
 * 监听 abort：触发时先调用回调尝试优雅停止；回调返回 false 则立即 abort 内部控制器，返回 true 则给 5 秒宽限再 abort 并销毁 stdio。返回清理函数。
 */
function scheduleGracefulAbort(child, pid, abortSignal, tellBeforeKill, controller) {
  let timer;
  let finished = false;
  let onAbort = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    Promise.resolve()
      .then(() => tellBeforeKill(pid))
      .catch(() => false)
      .then((told) => {
        if (finished) return;
        if (!told) {
          controller.abort(abortSignal.reason);
          return;
        }
        timer = setTimeout(
          (childToKill, reason, { stdout, stderr }) => {
            childToKill.abort(reason);
            stdout?.destroy();
            stderr?.destroy();
          },
          ABORT_GRACEFUL_MS,
          controller,
          abortSignal.reason,
          child,
        );
      });
  };
  if (abortSignal.aborted) onAbort();
  else
    abortSignal.addEventListener("abort", onAbort, {
      once: true,
    });
  return () => {
    finished = true;
    abortSignal.removeEventListener("abort", onAbort);
    clearTimeout(timer);
  };
}
//@ chunk-sycgf9xs.js:15285-15426 sole-consumer
/**
 * 子进程仍在运行（有 pid、无 exitCode/signalCode）时等待 exit 事件，带超时；kill 后等待退出用。
 */
async function waitForChildExit(child, deadlineMs) {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  await withDeadline(new Promise((resolve) => child.once("exit", () => resolve())), deadlineMs);
}
//@ chunk-sycgf9xs.js:15426-15540 sole-consumer
/**
 * 判断错误是否为子进程输出超出 maxBuffer（ERR_CHILD_PROCESS_STDIO_MAXBUFFER、isMaxBuffer 或 MaxBufferError）。
 */
function isMaxBufferError(error) {
  return (
    getErrnoCode(error) === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ||
    error?.isMaxBuffer === true ||
    error?.name === "MaxBufferError"
  );
}
//@ chunk-sycgf9xs.js:15540-15858 sole-consumer
/**
 * 子进程因参数含空字节被拒时的说明文字（cwd、可执行路径、argv、环境变量名或值）。
 */
var NULL_BYTE_SPAWN_MESSAGES = {
  cwd: "execFileNoThrow spawn rejected: null byte in cwd",
  file: "execFileNoThrow spawn rejected: null byte in executable path",
  argv: "execFileNoThrow spawn rejected: null byte in argv",
  envName: "execFileNoThrow spawn rejected: null byte in env name",
  envValue: "execFileNoThrow spawn rejected: null byte in env value",
};
//@ chunk-sycgf9xs.js:15858-16772 sole-consumer
/**
 * spawn 被运行时拒绝时找原因：依次检查 cwd、可执行文件路径、某个 argv、环境变量名、环境变量值中是否含空字节，返回 {telemetry 类别, local 给人看的说明}；都没有时返回 undefined。
 */
function describeNullByteSpawnError(command, argv, cwd, envOverrides, env, env_2) {
  let prefix = `the runtime rejected ${escapeForDisplay(basename(command))} because`;
  if (typeof cwd === "string" && cwd.includes("\x00"))
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.cwd,
      local: `${prefix} the working directory contains a null byte (\\0)`,
    };
  if (command.includes("\x00"))
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.file,
      local: `${prefix} the executable path contains a null byte (\\0)`,
    };
  let index = argv.findIndex((arg) => typeof arg === "string" && arg.includes("\x00"));
  if (index !== -1)
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.argv,
      local: `${prefix} the argument at index ${index} (zero-based) contains a null byte (\\0)`,
    };
  let filtered = Object.entries({
    ...env,
    ...envOverrides,
  }).filter(([, value]) => value !== undefined);
  let found = filtered.find(([key]) => key.includes("\x00"));
  if (found !== undefined)
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envName,
      local: `${prefix} the name of environment variable ${describeEnvEntry(found[0])} contains a null byte (\\0)${envNullByteScopeText(found, env_2)}`,
    };
  let found_2 = filtered.find(([, value]) => typeof value === "string" && value.includes("\x00"));
  return (
    found_2 && {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envValue,
      local: `${prefix} the value of environment variable ${describeEnvEntry(found_2[0])} contains a null byte (\\0)${envNullByteScopeText(found_2, env_2)}`,
    }
  );
}
//@ chunk-sycgf9xs.js:16772-16962 sole-consumer
function envNullByteScopeText([key, value], env) {
  return env[key] === value
    ? "; every program this process starts will fail the same way until that variable is removed from its environment"
    : " (in the env passed for this command)";
}
//@ chunk-sycgf9xs.js:16962-16973 sole-consumer
var MAX_QUOTED_CHARS = 200;
//@ chunk-sycgf9xs.js:16973-17033 sole-consumer
function describeCharCount(count) {
  return count === 1 ? "1 character" : `${count} characters`;
}
//@ chunk-sycgf9xs.js:17033-17156 sole-consumer
function escapeForDisplay(text) {
  return jsonStringifyRaw(text)
    .slice(1, -1)
    .replace(/[^\x20-\x7e]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-sycgf9xs.js:17156-17346 sole-consumer
function describeEnvEntry(entry) {
  let index = entry.indexOf("=");
  let name = index === -1 ? entry : entry.slice(0, index);
  let isTruncated = name.length > MAX_QUOTED_CHARS;
  let quoted = `"${escapeForDisplay(isTruncated ? name.slice(0, MAX_QUOTED_CHARS) : name)}"${isTruncated ? "\u2026" : ""}`;
  return index === -1
    ? quoted
    : `${quoted} (then '=' and ${describeCharCount(entry.length - index - 1)}, not shown)`;
}
//@ chunk-sycgf9xs.js:17402-17601 sole-consumer
/**
 * 接管子进程 stdin 的 error 事件：错误码不在可忽略集合时记录 truncatedBy 并 kill 子进程；返回记录对象供结果报告输入被截断。
 */
function watchStdinErrors(child) {
  let state = {};
  let stdin;
  try {
    stdin = child.stdin;
  } catch {
    return state;
  }
  if (!stdin) return state;
  stdin.removeAllListeners("error");
  stdin.on("error", (error) => {
    let code = getErrnoCode(error) ?? "unknown";
    if (STALE_CONNECTION_ERROR_CODES.has(code)) return;
    state.truncatedBy ??= code;
    child.kill();
  });
  return state;
}
//@ chunk-sycgf9xs.js:17601-17721 fingerprint = getErrorMessage (1)
/**
 * 取执行失败的错误文本：shortMessage 优先，其次信号名，最后错误码字符串。
 */
function getErrorMessage(result, errorCode) {
  if (result.shortMessage) return result.shortMessage;
  if (typeof result.signal === "string") return result.signal;
  return String(errorCode);
}
//@ chunk-sycgf9xs.js:17721-17960 sole-consumer
function spawnFailureMessage(child, error) {
  if (
    !isSyscallError(error) ||
    error.code === undefined ||
    typeof error.syscall !== "string" ||
    !error.syscall.startsWith("spawn") ||
    child.exitCode !== undefined ||
    child.timedOut ||
    child.isCanceled ||
    getErrnoCode(child) === error.code
  )
    return;
  return `Command failed with ${error.code}: ${child.command}
${error.message}`;
}
//@ chunk-sycgf9xs.js:17960-17976 sole-consumer
var MAX_BOM_SLICE = 3;
var MAX_UTF8_SLICE = 1e8;
//@ chunk-sycgf9xs.js:17976-18272 sole-consumer
function decodeOutput(buffer, encoding) {
  if (buffer instanceof Uint8Array && encoding === "utf8-keep-bom")
    return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).toString("utf8");
  let text =
    buffer instanceof Uint8Array
      ? Buffer.from(buffer).toString("latin1")
      : typeof buffer === "string"
        ? buffer
        : "";
  return encoding === "utf8-keep-bom" ? Buffer.from(text, "latin1").toString("utf8") : text;
}
//@ chunk-sycgf9xs.js:18272-22243 sole-consumer
/**
 * execFileNoThrow 的核心：对 git 构造安全调用（禁仓库 hook/终端提示、找到的仓库须在仓库外启动），可脱离控制终端并在退出时杀进程组，支持优雅中止、stdin 输入、输出回调与内存 cgroup；按编码解码输出、处理 maxBuffer 与超时，永不抛异常而返回 code/error。
 */
async function execFileCore(
  file,
  args,
  {
    abortSignal,
    timeout: timeoutMs = 10 * SECONDS_PER_MINUTE * SECONDS_PER_MS,
    preserveOutputOnError = true,
    cwd,
    env: envOverrides,
    extendEnv,
    maxBuffer,
    shell,
    stdin,
    input,
    stdout,
    stderr,
    stripFinalNewline,
    encoding,
    allowRepoGitHooks,
    allowGitTerminalPrompt,
    gitStartsIn,
    useToolMemoryCgroup = true,
    toolCgroupClass = "helper",
    waitForExitAfterKill = false,
    onStdoutData,
    inheritFd,
    withoutControllingTerminal = false,
    tellBeforeKill,
    abortEndsProcessGroup = false,
  } = {
    timeout: 10 * SECONDS_PER_MINUTE * SECONDS_PER_MS,
    preserveOutputOnError: true,
    maxBuffer: 1e6,
  },
) {
  if (isDisklessSession())
    return {
      stdout: "",
      stderr: DISKLESS_PROGRAM_REFUSAL,
      code: 126,
      error: DISKLESS_PROGRAM_REFUSAL,
    };
  let command = file;
  let env_2 = process.env;
  let safeGitInvocation = buildSafeGitInvocation(
    command,
    args,
    envOverrides === undefined
      ? env_2
      : extendEnv === false
        ? envOverrides
        : {
            ...env_2,
            ...envOverrides,
          },
    envOverrides && "GIT_CONFIG_COUNT" in envOverrides ? envOverrides.GIT_CONFIG_COUNT : env.GIT_CONFIG_COUNT,
    {
      allowRepoGitHooks,
      allowGitTerminalPrompt,
    },
  );
  if (safeGitInvocation !== null && isGitMissingMessageSupported(command, safeGitInvocation.env))
    return {
      stdout: "",
      stderr: GIT_MISSING_MAC_MESSAGE,
      code: 127,
      error: GIT_MISSING_MAC_MESSAGE,
    };
  let safeGitInvocation_2 =
    safeGitInvocation !== null && gitStartsIn instanceof GitStartFolderError && cwd !== undefined
      ? buildGitInvocation(gitStartsIn, cwd, safeGitInvocation.args, safeGitInvocation.env)
      : null;
  if (
    safeGitInvocation !== null &&
    envOverrides?.[CLAUDE_CODE_FOUND_REPOSITORY_GIT] !== undefined &&
    safeGitInvocation_2 === null
  ) {
    let errorText = `${basename(file)} was not started: a found repository's git must start outside the repository's folder`;
    logForDebugging(errorText, {
      level: "error",
    });
    return {
      stdout: "",
      stderr: errorText,
      code: 1,
      error: errorText,
    };
  }
  let finalArgs = safeGitInvocation_2?.args ?? safeGitInvocation?.args ?? args;
  let cwd_2 = safeGitInvocation_2?.cwd ?? cwd;
  let finalEnv = safeGitInvocation_2?.env ?? safeGitInvocation?.env ?? envOverrides;
  let detachProcess = withoutControllingTerminal && getPlatform() !== "windows";
  if (detachProcess && isCleanupStarted()) {
    let errorText = `${basename(file)} was not started because Claude Code was exiting; try again after it restarts`;
    return {
      stdout: "",
      stderr: errorText,
      code: 1,
      error: errorText,
    };
  }
  let childProcess;
  let pid;
  let killGroupCleanup;
  let cancelGracefulAbort;
  let cancelGroupKill;
  let internalController =
    tellBeforeKill !== undefined && abortSignal !== undefined ? new AbortController() : undefined;
  let stdinState;
  let detachOptions =
    getPlatform() === "linux"
      ? {
          noChildLeft: true,
        }
      : {};
  let processGroupFlags = detachOptions;
  let spawnError;
  let utf8MaxBytes = encoding === "utf8-keep-bom" ? (maxBuffer ?? MAX_UTF8_SLICE) : undefined;
  try {
    let child = execa(command, finalArgs, {
      signal: internalController?.signal ?? abortSignal,
      timeout: timeoutMs,
      cwd: cwd_2,
      env: finalEnv,
      shell,
      ...(inheritFd === undefined
        ? {
            stdin,
            ...(stdout === undefined
              ? {}
              : {
                  stdout,
                }),
            ...(stderr === undefined
              ? {}
              : {
                  stderr,
                }),
          }
        : {
            stdio: [stdin, stdout, stderr, inheritFd],
          }),
      ...(utf8MaxBytes !== undefined
        ? {
            maxBuffer: Math.min(utf8MaxBytes * MAX_BOM_SLICE, constants.MAX_STRING_LENGTH),
          }
        : maxBuffer === undefined
          ? {}
          : {
              maxBuffer,
            }),
      ...(stripFinalNewline === undefined
        ? {}
        : {
            stripFinalNewline,
          }),
      ...(encoding !== undefined &&
        encoding !== "utf8" && {
          encoding: "latin1",
        }),
      ...(safeGitInvocation_2 !== null
        ? {
            extendEnv: false,
          }
        : extendEnv === undefined
          ? {}
          : {
              extendEnv,
            }),
      ...(useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {}),
      ...(detachProcess && {
        detached: true,
      }),
      reject: false,
    });
    processGroupFlags = child.pid === undefined ? detachOptions : {};
    if (
      tellBeforeKill !== undefined &&
      abortSignal !== undefined &&
      internalController !== undefined &&
      child.pid !== undefined
    )
      cancelGracefulAbort = scheduleGracefulAbort(
        child,
        child.pid,
        abortSignal,
        tellBeforeKill,
        internalController,
      );
    pid = detachProcess ? child.pid : undefined;
    if (pid !== undefined) {
      let pid_2 = pid;
      if (abortEndsProcessGroup && abortSignal !== undefined)
        cancelGroupKill = killProcessGroupOnAbort(child, pid_2, abortSignal);
      let killOnExit = () => killProcessGroup(pid_2);
      let unregisterCleanup = registerCleanup(killOnExit);
      let unregisterExit = onExit(killOnExit, {
        alwaysLast: true,
      });
      killGroupCleanup = () => {
        unregisterCleanup();
        unregisterExit();
      };
    }
    child.once("error", (error) => {
      spawnError = error;
    });
    stdinState = input === undefined ? undefined : watchStdinErrors(child);
    if (input !== undefined && child.pid !== undefined) child.stdin?.end(input);
    if (onStdoutData && child.pid !== undefined)
      child.stdout?.on("data", (chunk) => {
        try {
          onStdoutData(chunk.toString());
        } catch (error) {
          logError(error);
        }
      });
    childProcess = await child;
    if (
      waitForExitAfterKill &&
      childProcess.exitCode === undefined &&
      (abortSignal?.aborted === true || childProcess.timedOut)
    )
      await waitForChildExit(child, ABORT_KILL_GRACE_MS);
  } catch (error) {
    let { message, shortMessage, originalMessage } = error;
    let errorMessage =
      shortMessage === undefined
        ? message
        : (originalMessage ?? "the spawn threw a value that is not an Error");
    if (isSyscallError(error)) {
      logForDebugging(`execFileNoThrow spawn failed: ${getErrnoCode(error)} ${errorMessage}`, {
        level: "error",
      });
      return {
        stdout: "",
        stderr: "",
        code: 1,
        ...processGroupFlags,
      };
    } else if (isMaxBufferError(error)) {
      logForDebugging(`execFileNoThrow maxBuffer exceeded: ${errorMessage}`, {
        level: "error",
      });
      return {
        stdout: "",
        stderr: "",
        code: 1,
        maxBufferExceeded: true,
      };
    } else {
      let env = process.env;
      let rejection =
        getErrnoCode(error) === "ERR_INVALID_ARG_VALUE"
          ? describeNullByteSpawnError(
              command,
              args,
              cwd,
              finalEnv,
              extendEnv === false && finalEnv !== undefined ? undefined : env,
              env,
            )
          : undefined;
      if (rejection)
        logForDebugging(`execFileNoThrow spawn refused: ${rejection.local}`, {
          level: "error",
        });
      let error_2 = toError(error);
      logError(
        withTelemetryMessage(
          rejection === undefined && shortMessage === undefined
            ? error_2
            : shortErrorStack(error_2, rejection?.telemetry ?? errorMessage),
          rejection?.telemetry ?? "execFileNoThrow unexpected rejection",
        ),
      );
    }
    return {
      stdout: "",
      stderr: "",
      code: 1,
    };
  } finally {
    cancelGracefulAbort?.();
    cancelGroupKill?.();
    killGroupCleanup?.();
    if (pid !== undefined && (childProcess === undefined || childProcess.exitCode === undefined))
      killProcessGroup(pid);
  }
  if (stdinState?.truncatedBy !== undefined) {
    let message = `stdin write failed: ${stdinState.truncatedBy}`;
    logForDebugging(`execFileNoThrow ${message}`, {
      level: "error",
    });
    return {
      stdout: "",
      stderr: "",
      code: 1,
      error: message,
    };
  }
  let stdoutText = decodeOutput(childProcess.stdout, encoding);
  let stderrText = decodeOutput(childProcess.stderr, encoding);
  if (utf8MaxBytes !== undefined && (stdoutText.length > utf8MaxBytes || stderrText.length > utf8MaxBytes))
    return preserveOutputOnError
      ? {
          stdout: stdoutText.slice(0, utf8MaxBytes),
          stderr: stderrText.slice(0, utf8MaxBytes),
          code: 1,
          error: `Command failed: ${childProcess.command}
maxBuffer exceeded`,
          maxBufferExceeded: true,
        }
      : {
          stdout: "",
          stderr: "",
          code: 1,
          maxBufferExceeded: true,
        };
  if (!childProcess.failed)
    return {
      stdout: stdoutText,
      stderr: stderrText,
      code: 0,
      exitCode: 0,
    };
  let maxBufferFlag = isMaxBufferError(childProcess)
    ? {
        maxBufferExceeded: true,
      }
    : {};
  let timedOutFlag = childProcess.timedOut
    ? {
        timedOut: true,
      }
    : {};
  if (!preserveOutputOnError)
    return {
      stdout: "",
      stderr: "",
      code: childProcess.exitCode ?? 1,
      exitCode: childProcess.exitCode,
      ...maxBufferFlag,
      ...timedOutFlag,
      ...processGroupFlags,
    };
  let exitCode = childProcess.exitCode ?? 1;
  return {
    stdout: stdoutText,
    stderr: stderrText,
    code: exitCode,
    error: spawnFailureMessage(childProcess, spawnError) ?? getErrorMessage(childProcess, exitCode),
    exitCode: childProcess.exitCode,
    ...maxBufferFlag,
    ...timedOutFlag,
    ...processGroupFlags,
  };
}
//@ chunk-s61vbvea.js:531652-531881 fingerprint = execFileNoThrowWithCwd (0.521)
/**
 * 在指定目录运行 git（带固定前置参数），成功返回去空白的 stdout，失败/非零返回 undefined。
 */
async function execGitNoThrow(file, args, abortSignal) {
  try {
    let { stdout, code } = await execFileNoThrowWithCwd(gitExe(), [...SAFE_GIT_REPO_ARGS, ...args], {
      cwd: file,
      timeout: GIT_CONFIG_PARAMETERS_LIMIT,
      maxBuffer: 1e5,
      abortSignal,
      preserveOutputOnError: false,
      useToolMemoryCgroup: false,
    });
    if (code !== 0) return;
    return stdout.trim() || undefined;
  } catch {
    return;
  }
}
export {
  execFileNoThrowWithCwd,
  execFileNoThrow,
  execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING,
  INHERITED_FD_PATH,
  execGitNoThrow,
};
