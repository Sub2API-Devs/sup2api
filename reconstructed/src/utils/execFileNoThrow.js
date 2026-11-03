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
import { BMt, GIT_CONFIG_PARAMETERS_LIMIT } from "./git/gitSafeEnv.js";

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
    abortSignal: n,
    timeout: r = 10 * SECONDS_PER_MINUTE_2 * MS_PER_SECOND,
    input,
    stdio = ["ignore", "pipe", "pipe"],
    useToolMemoryCgroup: u,
  } = {},
) {
  n?.throwIfAborted();
  using c = slowLogging`exec: ${command.slice(0, 200)}`;
  try {
    let result = safeExecShellSync(command, {
      env: process.env,
      maxBuffer: 1e6,
      timeout: r,
      cwd: getCwdIfAvailable(),
      stdio,
      reject: false,
      input,
      useToolMemoryCgroup: u,
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
  e,
  n,
  r = {
    timeout: 10 * SECONDS_PER_MINUTE * SECONDS_PER_MS,
    preserveOutputOnError: true,
    useCwd: true,
  },
) {
  return catchExecError(() =>
    execFileNoThrowWithCwd(e, n, {
      allowRepoGitHooks: r.allowRepoGitHooks,
      allowGitTerminalPrompt: r.allowGitTerminalPrompt,
      abortSignal: r.abortSignal,
      timeout: r.timeout,
      preserveOutputOnError: r.preserveOutputOnError,
      cwd: r.cwd ?? (r.useCwd && !isDisklessSession() ? getCwdIfAvailable() : undefined),
      env: r.env,
      extendEnv: r.extendEnv,
      stdin: r.stdin,
      input: r.input,
      stdout: r.stdout,
      stderr: r.stderr,
      maxBuffer: r.maxBuffer,
      stripFinalNewline: r.stripFinalNewline,
      useToolMemoryCgroup: r.useToolMemoryCgroup,
      toolCgroupClass: r.toolCgroupClass,
      waitForExitAfterKill: r.waitForExitAfterKill,
      inheritFd: r.inheritFd,
      gitStartsIn: r.gitStartsIn,
    }),
  );
}
//@ chunk-sycgf9xs.js:14358-14470 layout
async function catchExecError(e) {
  try {
    return await e();
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
function execFileNoThrowWithCwd(file, n, r) {
  return catchExecError(() => (r === undefined ? execFileCore(file, n) : execFileCore(file, n, r)));
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
function killProcessGroupOnAbort(e, pid, abortSignal) {
  let o;
  let s = () => {
    killProcessGroup(pid);
    o = setTimeout(
      ({ stdout, stderr }) => {
        stdout?.destroy();
        stderr?.destroy();
      },
      PIPE_DESTROY_DELAY_MS,
      e,
    );
  };
  if (abortSignal.aborted) s();
  else
    abortSignal.addEventListener("abort", s, {
      once: true,
    });
  return () => {
    abortSignal.removeEventListener("abort", s);
    clearTimeout(o);
  };
}
//@ chunk-sycgf9xs.js:14854-14866 sole-consumer
var ABORT_GRACEFUL_MS = 5000;
//@ chunk-sycgf9xs.js:14866-15285 sole-consumer
/**
 * 监听 abort：触发时先调用回调尝试优雅停止；回调返回 false 则立即 abort 内部控制器，返回 true 则给 5 秒宽限再 abort 并销毁 stdio。返回清理函数。
 */
function scheduleGracefulAbort(e, pid, abortSignal, o, s) {
  let u;
  let c = false;
  let d = () => {
    if (e.exitCode !== null || e.signalCode !== null) return;
    Promise.resolve()
      .then(() => o(pid))
      .catch(() => false)
      .then((g) => {
        if (c) return;
        if (!g) {
          s.abort(abortSignal.reason);
          return;
        }
        u = setTimeout(
          (f, m, { stdout, stderr }) => {
            f.abort(m);
            stdout?.destroy();
            stderr?.destroy();
          },
          ABORT_GRACEFUL_MS,
          s,
          abortSignal.reason,
          e,
        );
      });
  };
  if (abortSignal.aborted) d();
  else
    abortSignal.addEventListener("abort", d, {
      once: true,
    });
  return () => {
    c = true;
    abortSignal.removeEventListener("abort", d);
    clearTimeout(u);
  };
}
//@ chunk-sycgf9xs.js:15285-15426 sole-consumer
/**
 * 子进程仍在运行（有 pid、无 exitCode/signalCode）时等待 exit 事件，带超时；kill 后等待退出用。
 */
async function waitForChildExit(e, n) {
  if (e.pid === undefined || e.exitCode !== null || e.signalCode !== null) return;
  await withDeadline(new Promise((resolve) => e.once("exit", () => resolve())), n);
}
//@ chunk-sycgf9xs.js:15426-15540 sole-consumer
/**
 * 判断错误是否为子进程输出超出 maxBuffer（ERR_CHILD_PROCESS_STDIO_MAXBUFFER、isMaxBuffer 或 MaxBufferError）。
 */
function isMaxBufferError(e) {
  return (
    getErrnoCode(e) === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ||
    e?.isMaxBuffer === true ||
    e?.name === "MaxBufferError"
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
function describeNullByteSpawnError(e, n, cwd, o, s, env) {
  let c = `the runtime rejected ${escapeForDisplay(basename(e))} because`;
  if (typeof cwd === "string" && cwd.includes("\x00"))
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.cwd,
      local: `${c} the working directory contains a null byte (\\0)`,
    };
  if (e.includes("\x00"))
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.file,
      local: `${c} the executable path contains a null byte (\\0)`,
    };
  let index = n.findIndex((h) => typeof h === "string" && h.includes("\x00"));
  if (index !== -1)
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.argv,
      local: `${c} the argument at index ${index} (zero-based) contains a null byte (\\0)`,
    };
  let filtered = Object.entries({
    ...s,
    ...o,
  }).filter(([, value]) => value !== undefined);
  let found = filtered.find(([h]) => h.includes("\x00"));
  if (found !== undefined)
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envName,
      local: `${c} the name of environment variable ${describeEnvEntry(found[0])} contains a null byte (\\0)${envNullByteScopeText(found, env)}`,
    };
  let found_2 = filtered.find(([, h]) => typeof h === "string" && h.includes("\x00"));
  return (
    found_2 && {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envValue,
      local: `${c} the value of environment variable ${describeEnvEntry(found_2[0])} contains a null byte (\\0)${envNullByteScopeText(found_2, env)}`,
    }
  );
}
//@ chunk-sycgf9xs.js:16772-16962 sole-consumer
function envNullByteScopeText([e, n], r) {
  return r[e] === n
    ? "; every program this process starts will fail the same way until that variable is removed from its environment"
    : " (in the env passed for this command)";
}
//@ chunk-sycgf9xs.js:16962-16973 sole-consumer
var MAX_QUOTED_CHARS = 200;
//@ chunk-sycgf9xs.js:16973-17033 sole-consumer
function describeCharCount(e) {
  return e === 1 ? "1 character" : `${e} characters`;
}
//@ chunk-sycgf9xs.js:17033-17156 sole-consumer
function escapeForDisplay(e) {
  return jsonStringifyRaw(e)
    .slice(1, -1)
    .replace(/[^\x20-\x7e]/g, (n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-sycgf9xs.js:17156-17346 sole-consumer
function describeEnvEntry(e) {
  let index = e.indexOf("=");
  let r = index === -1 ? e : e.slice(0, index);
  let o = r.length > MAX_QUOTED_CHARS;
  let s = `"${escapeForDisplay(o ? r.slice(0, MAX_QUOTED_CHARS) : r)}"${o ? "\u2026" : ""}`;
  return index === -1 ? s : `${s} (then '=' and ${describeCharCount(e.length - index - 1)}, not shown)`;
}
//@ chunk-sycgf9xs.js:17402-17601 sole-consumer
/**
 * 接管子进程 stdin 的 error 事件：错误码不在可忽略集合时记录 truncatedBy 并 kill 子进程；返回记录对象供结果报告输入被截断。
 */
function watchStdinErrors(e) {
  let n = {};
  let r;
  try {
    r = e.stdin;
  } catch {
    return n;
  }
  if (!r) return n;
  r.removeAllListeners("error");
  r.on("error", (o) => {
    let s = getErrnoCode(o) ?? "unknown";
    if (STALE_CONNECTION_ERROR_CODES.has(s)) return;
    n.truncatedBy ??= s;
    e.kill();
  });
  return n;
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
function spawnFailureMessage(e, n) {
  if (
    !isSyscallError(n) ||
    n.code === undefined ||
    typeof n.syscall !== "string" ||
    !n.syscall.startsWith("spawn") ||
    e.exitCode !== undefined ||
    e.timedOut ||
    e.isCanceled ||
    getErrnoCode(e) === n.code
  )
    return;
  return `Command failed with ${n.code}: ${e.command}
${n.message}`;
}
//@ chunk-sycgf9xs.js:17960-17976 sole-consumer
var MAX_BOM_SLICE = 3;
var MAX_UTF8_SLICE = 1e8;
//@ chunk-sycgf9xs.js:17976-18272 sole-consumer
function decodeOutput(e, encoding) {
  if (e instanceof Uint8Array && encoding === "utf8-keep-bom")
    return Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
  let r = e instanceof Uint8Array ? Buffer.from(e).toString("latin1") : typeof e === "string" ? e : "";
  return encoding === "utf8-keep-bom" ? Buffer.from(r, "latin1").toString("utf8") : r;
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
    tellBeforeKill: D,
    abortEndsProcessGroup: ze = false,
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
  let b = file;
  let env_2 = process.env;
  let safeGitInvocation = buildSafeGitInvocation(
    b,
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
  if (safeGitInvocation !== null && isGitMissingMessageSupported(b, safeGitInvocation.env))
    return {
      stdout: "",
      stderr: GIT_MISSING_MAC_MESSAGE,
      code: 127,
      error: GIT_MISSING_MAC_MESSAGE,
    };
  let w =
    safeGitInvocation !== null && gitStartsIn instanceof GitStartFolderError && cwd !== undefined
      ? buildGitInvocation(gitStartsIn, cwd, safeGitInvocation.args, safeGitInvocation.env)
      : null;
  if (
    safeGitInvocation !== null &&
    envOverrides?.[CLAUDE_CODE_FOUND_REPOSITORY_GIT] !== undefined &&
    w === null
  ) {
    let a = `${basename(file)} was not started: a found repository's git must start outside the repository's folder`;
    logForDebugging(a, {
      level: "error",
    });
    return {
      stdout: "",
      stderr: a,
      code: 1,
      error: a,
    };
  }
  let qe = w?.args ?? safeGitInvocation?.args ?? args;
  let cwd_2 = w?.cwd ?? cwd;
  let B = w?.env ?? safeGitInvocation?.env ?? envOverrides;
  let U = withoutControllingTerminal && getPlatform() !== "windows";
  if (U && isCleanupStarted()) {
    let a = `${basename(file)} was not started because Claude Code was exiting; try again after it restarts`;
    return {
      stdout: "",
      stderr: a,
      code: 1,
      error: a,
    };
  }
  let result;
  let pid;
  let se;
  let ue;
  let ce;
  let H = D !== undefined && abortSignal !== undefined ? new AbortController() : undefined;
  let W;
  let de =
    getPlatform() === "linux"
      ? {
          noChildLeft: true,
        }
      : {};
  let F = de;
  let ae;
  let T = encoding === "utf8-keep-bom" ? (maxBuffer ?? MAX_UTF8_SLICE) : undefined;
  try {
    let a = execa(b, qe, {
      signal: H?.signal ?? abortSignal,
      timeout: timeoutMs,
      cwd: cwd_2,
      env: B,
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
      ...(T !== undefined
        ? {
            maxBuffer: Math.min(T * MAX_BOM_SLICE, constants.MAX_STRING_LENGTH),
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
      ...(w !== null
        ? {
            extendEnv: false,
          }
        : extendEnv === undefined
          ? {}
          : {
              extendEnv,
            }),
      ...(useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {}),
      ...(U && {
        detached: true,
      }),
      reject: false,
    });
    F = a.pid === undefined ? de : {};
    if (D !== undefined && abortSignal !== undefined && H !== undefined && a.pid !== undefined)
      ue = scheduleGracefulAbort(a, a.pid, abortSignal, D, H);
    pid = U ? a.pid : undefined;
    if (pid !== undefined) {
      let pid_2 = pid;
      if (ze && abortSignal !== undefined) ce = killProcessGroupOnAbort(a, pid_2, abortSignal);
      let O = () => killProcessGroup(pid_2);
      let V = registerCleanup(O);
      let P = onExit(O, {
        alwaysLast: true,
      });
      se = () => {
        V();
        P();
      };
    }
    a.once("error", (E) => {
      ae = E;
    });
    W = input === undefined ? undefined : watchStdinErrors(a);
    if (input !== undefined && a.pid !== undefined) a.stdin?.end(input);
    if (onStdoutData && a.pid !== undefined)
      a.stdout?.on("data", (E) => {
        try {
          onStdoutData(E.toString());
        } catch (error) {
          logError(error);
        }
      });
    result = await a;
    if (
      waitForExitAfterKill &&
      result.exitCode === undefined &&
      (abortSignal?.aborted === true || result.timedOut)
    )
      await waitForChildExit(a, ABORT_KILL_GRACE_MS);
  } catch (error) {
    let { message, shortMessage, originalMessage } = error;
    let P =
      shortMessage === undefined
        ? message
        : (originalMessage ?? "the spawn threw a value that is not an Error");
    if (isSyscallError(error)) {
      logForDebugging(`execFileNoThrow spawn failed: ${getErrnoCode(error)} ${P}`, {
        level: "error",
      });
      return {
        stdout: "",
        stderr: "",
        code: 1,
        ...F,
      };
    } else if (isMaxBufferError(error)) {
      logForDebugging(`execFileNoThrow maxBuffer exceeded: ${P}`, {
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
      let A =
        getErrnoCode(error) === "ERR_INVALID_ARG_VALUE"
          ? describeNullByteSpawnError(
              b,
              args,
              cwd,
              B,
              extendEnv === false && B !== undefined ? undefined : env,
              env,
            )
          : undefined;
      if (A)
        logForDebugging(`execFileNoThrow spawn refused: ${A.local}`, {
          level: "error",
        });
      let error_2 = toError(error);
      logError(
        withTelemetryMessage(
          A === undefined && shortMessage === undefined
            ? error_2
            : shortErrorStack(error_2, A?.telemetry ?? P),
          A?.telemetry ?? "execFileNoThrow unexpected rejection",
        ),
      );
    }
    return {
      stdout: "",
      stderr: "",
      code: 1,
    };
  } finally {
    ue?.();
    ce?.();
    se?.();
    if (pid !== undefined && (result === undefined || result.exitCode === undefined)) killProcessGroup(pid);
  }
  if (W?.truncatedBy !== undefined) {
    let a = `stdin write failed: ${W.truncatedBy}`;
    logForDebugging(`execFileNoThrow ${a}`, {
      level: "error",
    });
    return {
      stdout: "",
      stderr: "",
      code: 1,
      error: a,
    };
  }
  let G = decodeOutput(result.stdout, encoding);
  let L = decodeOutput(result.stderr, encoding);
  if (T !== undefined && (G.length > T || L.length > T))
    return preserveOutputOnError
      ? {
          stdout: G.slice(0, T),
          stderr: L.slice(0, T),
          code: 1,
          error: `Command failed: ${result.command}
maxBuffer exceeded`,
          maxBufferExceeded: true,
        }
      : {
          stdout: "",
          stderr: "",
          code: 1,
          maxBufferExceeded: true,
        };
  if (!result.failed)
    return {
      stdout: G,
      stderr: L,
      code: 0,
      exitCode: 0,
    };
  let le = isMaxBufferError(result)
    ? {
        maxBufferExceeded: true,
      }
    : {};
  let fe = result.timedOut
    ? {
        timedOut: true,
      }
    : {};
  if (!preserveOutputOnError)
    return {
      stdout: "",
      stderr: "",
      code: result.exitCode ?? 1,
      exitCode: result.exitCode,
      ...le,
      ...fe,
      ...F,
    };
  let exitCode = result.exitCode ?? 1;
  return {
    stdout: G,
    stderr: L,
    code: exitCode,
    error: spawnFailureMessage(result, ae) ?? getErrorMessage(result, exitCode),
    exitCode: result.exitCode,
    ...le,
    ...fe,
    ...F,
  };
}
//@ chunk-s61vbvea.js:531652-531881 fingerprint = execFileNoThrowWithCwd (0.521)
/**
 * 在指定目录运行 git（带固定前置参数），成功返回去空白的 stdout，失败/非零返回 undefined。
 */
async function execGitNoThrow(file, args, abortSignal) {
  try {
    let { stdout, code } = await execFileNoThrowWithCwd(gitExe(), [...BMt, ...args], {
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
