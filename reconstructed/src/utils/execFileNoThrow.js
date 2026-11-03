/**
 * utils/execFileNoThrow.ts
 *
 * 不抛异常地执行 git/git diff 子进程并返回输出（316 中这几个函数都固定执行 git）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/execFileNoThrow.ts
 * pieces: chunk-s61vbvea.js (2), chunk-sycgf9xs.js (26)
 * attribution: fingerprint 2, affinity 5, facade-exports 4, layout 1, sole-consumer 16
 */
import { basename, basename as basename_2 } from "path";
import { constants } from "buffer";
import { slowLogging, jsonStringifyRaw } from "./slowOperations.js";
import { safeExecShellSync } from "./safeSpawn.js";
import { Odo } from "./cwd.js";
import { Tv, ije } from "./disklessSession.js";
import { logError } from "./log.js";
import { toError, getErrnoCode, isSyscallError, withTelemetryMessage, shortErrorStack } from "./errors.js";
import { withDeadline } from "./sleep.js";
import { STALE_CONNECTION_ERROR_CODES } from "../services/api/withRetry.js";
import { buildSafeGitInvocation } from "./git/gitSafeInvocation.js";
import { env } from "./env.js";
import { fje, GIT_MISSING_MAC_MESSAGE } from "./git/gitMissingMessage.js";
import { GitStartFolderError, buildGitInvocation, CLAUDE_CODE_FOUND_REPOSITORY_GIT } from "./gitSafeExec.js";
import { logForDebugging } from "./debug.js";
import { getPlatform } from "./platform.js";
import { isCleanupStarted, registerCleanup } from "./cleanupRegistry.js";
import { WMt } from "../../vendor/execa/index.js";
import { Nd } from "./toolCgroup.js";
import { onExit } from "../../vendor/signal-exit/dist/mjs/index.js";
import { gitExe } from "./git.js";
import { freeze_7, USr } from "./git/gitSafeEnv.js";

//@ chunk-sycgf9xs.js:13305-13323 affinity
var MS_PER_SECOND = 1000,
  SECONDS_PER_MINUTE = 60;
/**
 * 同步执行 shell 命令（默认 10 分钟超时、1MB 输出），失败或无输出返回 null。
 */
//@ chunk-sycgf9xs.js:13323-13686 facade-exports = execSyncWithDefaults_DEPRECATED (0.916)
function execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING(
  command,
  {
    abortSignal: n,
    timeout: r = 10 * SECONDS_PER_MINUTE * MS_PER_SECOND,
    input: o,
    stdio: s = ["ignore", "pipe", "pipe"],
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
      cwd: Odo(),
      stdio: s,
      reject: !1,
      input: o,
      useToolMemoryCgroup: u,
    });
    if (!result.stdout) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}
//@ chunk-sycgf9xs.js:13686-13724 facade-exports
var q = 1000,
  Q = 60,
  INHERITED_FD_PATH = "/proc/self/fd/3";
/**
 * execFileNoThrow：执行外部程序且从不抛错，返回 {stdout, stderr, code, error}。默认超时 10 分钟、保留出错输出、cwd 取当前会话目录（Tv() 为真时不设）；其余选项（abortSignal、env、stdin、cgroup、inheritFd、git 钩子/终端提示开关等）原样转给 execFileNoThrowWithCwd。
 */
//@ chunk-sycgf9xs.js:13724-14358 facade-exports
function execFileNoThrow(e, n, r = { timeout: 10 * Q * q, preserveOutputOnError: !0, useCwd: !0 }) {
  return catchExecError(() =>
    execFileNoThrowWithCwd(e, n, {
      allowRepoGitHooks: r.allowRepoGitHooks,
      allowGitTerminalPrompt: r.allowGitTerminalPrompt,
      abortSignal: r.abortSignal,
      timeout: r.timeout,
      preserveOutputOnError: r.preserveOutputOnError,
      cwd: r.cwd ?? (r.useCwd && !Tv() ? Odo() : void 0),
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
    return (logError(error), { stdout: "", stderr: "", code: 1, error: toError(error).message });
  }
}
/**
 * execFileNoThrowWithCwd：execFileNoThrow 的底层，按是否给出选项调用实际的 spawn 实现，并包一层同步异常转结果。
 */
//@ chunk-sycgf9xs.js:14470-14533 facade-exports
function execFileNoThrowWithCwd(e, n, r) {
  return catchExecError(() => (r === void 0 ? execFileCore(e, n) : execFileCore(e, n, r)));
}
/**
 * 向进程组（-pid）发 SIGTERM；pid ≤ 1 时不做，错误忽略。旧版名 stopRecording 是错配。
 */
//@ chunk-sycgf9xs.js:14533-14602 affinity = stopRecording (0.781)
function killProcessGroup(pid) {
  if (pid <= 1) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {}
}
//@ chunk-sycgf9xs.js:14602-14622 affinity
var Kt = 6000,
  Yt = 2000;
/**
 * 监听 abort：触发时杀掉子进程所在进程组，并在一段时间后销毁 stdout/stderr 管道，防止孙进程持有管道导致挂起。返回解除监听的函数。
 */
//@ chunk-sycgf9xs.js:14622-14854 affinity
function killProcessGroupOnAbort(e, n, r) {
  let o,
    s = () => {
      (killProcessGroup(n),
        (o = setTimeout(
          ({ stdout: stdout, stderr: stderr }) => {
            (stdout?.destroy(), stderr?.destroy());
          },
          Yt,
          e,
        )));
    };
  if (r.aborted) s();
  else r.addEventListener("abort", s, { once: !0 });
  return () => {
    (r.removeEventListener("abort", s), clearTimeout(o));
  };
}
//@ chunk-sycgf9xs.js:14854-14866 sole-consumer
var zt = 5000;
/**
 * 监听 abort：触发时先调用回调尝试优雅停止；回调返回 false 则立即 abort 内部控制器，返回 true 则给 5 秒宽限再 abort 并销毁 stdio。返回清理函数。
 */
//@ chunk-sycgf9xs.js:14866-15285 sole-consumer
function scheduleGracefulAbort(e, n, r, o, s) {
  let u,
    c = !1,
    d = () => {
      if (e.exitCode !== null || e.signalCode !== null) return;
      Promise.resolve()
        .then(() => o(n))
        .catch(() => !1)
        .then((g) => {
          if (c) return;
          if (!g) {
            s.abort(r.reason);
            return;
          }
          u = setTimeout(
            (f, m, { stdout: stdout, stderr: stderr }) => {
              (f.abort(m), stdout?.destroy(), stderr?.destroy());
            },
            zt,
            s,
            r.reason,
            e,
          );
        });
    };
  if (r.aborted) d();
  else r.addEventListener("abort", d, { once: !0 });
  return () => {
    ((c = !0), r.removeEventListener("abort", d), clearTimeout(u));
  };
}
/**
 * 子进程仍在运行（有 pid、无 exitCode/signalCode）时等待 exit 事件，带超时；kill 后等待退出用。
 */
//@ chunk-sycgf9xs.js:15285-15426 sole-consumer
async function waitForChildExit(e, n) {
  if (e.pid === void 0 || e.exitCode !== null || e.signalCode !== null) return;
  await withDeadline(new Promise((r) => e.once("exit", () => r())), n);
}
/**
 * 判断错误是否为子进程输出超出 maxBuffer（ERR_CHILD_PROCESS_STDIO_MAXBUFFER、isMaxBuffer 或 MaxBufferError）。
 */
//@ chunk-sycgf9xs.js:15426-15540 sole-consumer
function isMaxBufferError(e) {
  return (
    getErrnoCode(e) === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ||
    e?.isMaxBuffer === !0 ||
    e?.name === "MaxBufferError"
  );
}
/**
 * 子进程因参数含空字节被拒时的说明文字（cwd、可执行路径、argv、环境变量名或值）。
 */
//@ chunk-sycgf9xs.js:15540-15858 sole-consumer
var NULL_BYTE_SPAWN_MESSAGES = {
  cwd: "execFileNoThrow spawn rejected: null byte in cwd",
  file: "execFileNoThrow spawn rejected: null byte in executable path",
  argv: "execFileNoThrow spawn rejected: null byte in argv",
  envName: "execFileNoThrow spawn rejected: null byte in env name",
  envValue: "execFileNoThrow spawn rejected: null byte in env value",
};
/**
 * spawn 被运行时拒绝时找原因：依次检查 cwd、可执行文件路径、某个 argv、环境变量名、环境变量值中是否含空字节，返回 {telemetry 类别, local 给人看的说明}；都没有时返回 undefined。
 */
//@ chunk-sycgf9xs.js:15858-16772 sole-consumer
function describeNullByteSpawnError(e, n, r, o, s, u) {
  let c = `the runtime rejected ${escapeForDisplay(basename(e))} because`;
  if (typeof r === "string" && r.includes("\x00"))
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
  let filtered = Object.entries({ ...s, ...o }).filter(([, h]) => h !== void 0),
    found = filtered.find(([h]) => h.includes("\x00"));
  if (found !== void 0)
    return {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envName,
      local: `${c} the name of environment variable ${describeEnvEntry(found[0])} contains a null byte (\\0)${envNullByteScopeText(found, u)}`,
    };
  let found_2 = filtered.find(([, h]) => typeof h === "string" && h.includes("\x00"));
  return (
    found_2 && {
      telemetry: NULL_BYTE_SPAWN_MESSAGES.envValue,
      local: `${c} the value of environment variable ${describeEnvEntry(found_2[0])} contains a null byte (\\0)${envNullByteScopeText(found_2, u)}`,
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
var Me = 200;
//@ chunk-sycgf9xs.js:16973-17033 sole-consumer
function en(e) {
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
  let index = e.indexOf("="),
    r = index === -1 ? e : e.slice(0, index),
    o = r.length > Me,
    s = `"${escapeForDisplay(o ? r.slice(0, Me) : r)}"${o ? "\u2026" : ""}`;
  return index === -1 ? s : `${s} (then '=' and ${en(e.length - index - 1)}, not shown)`;
}
/**
 * 接管子进程 stdin 的 error 事件：错误码不在可忽略集合时记录 truncatedBy 并 kill 子进程；返回记录对象供结果报告输入被截断。
 */
//@ chunk-sycgf9xs.js:17402-17601 sole-consumer
function watchStdinErrors(e) {
  let n = {},
    r;
  try {
    r = e.stdin;
  } catch {
    return n;
  }
  if (!r) return n;
  return (
    r.removeAllListeners("error"),
    r.on("error", (o) => {
      let s = getErrnoCode(o) ?? "unknown";
      if (STALE_CONNECTION_ERROR_CODES.has(s)) return;
      ((n.truncatedBy ??= s), e.kill());
    }),
    n
  );
}
/**
 * 取执行失败的错误文本：shortMessage 优先，其次信号名，最后错误码字符串。
 */
//@ chunk-sycgf9xs.js:17601-17721 fingerprint = getErrorMessage (1)
function getErrorMessage(result, errorCode) {
  if (result.shortMessage) return result.shortMessage;
  if (typeof result.signal === "string") return result.signal;
  return String(errorCode);
}
//@ chunk-sycgf9xs.js:17721-17960 sole-consumer
function spawnFailureMessage(e, n) {
  if (
    !isSyscallError(n) ||
    n.code === void 0 ||
    typeof n.syscall !== "string" ||
    !n.syscall.startsWith("spawn") ||
    e.exitCode !== void 0 ||
    e.timedOut ||
    e.isCanceled ||
    getErrnoCode(e) === n.code
  )
    return;
  return `Command failed with ${n.code}: ${e.command}
${n.message}`;
}
//@ chunk-sycgf9xs.js:17960-17976 sole-consumer
var sn = 3,
  un = 1e8;
//@ chunk-sycgf9xs.js:17976-18272 sole-consumer
function decodeOutput(e, n) {
  if (e instanceof Uint8Array && n === "utf8-keep-bom")
    return Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
  let r = e instanceof Uint8Array ? Buffer.from(e).toString("latin1") : typeof e === "string" ? e : "";
  return n === "utf8-keep-bom" ? Buffer.from(r, "latin1").toString("utf8") : r;
}
/**
 * execFileNoThrow 的核心：对 git 构造安全调用（禁仓库 hook/终端提示、找到的仓库须在仓库外启动），可脱离控制终端并在退出时杀进程组，支持优雅中止、stdin 输入、输出回调与内存 cgroup；按编码解码输出、处理 maxBuffer 与超时，永不抛异常而返回 code/error。
 */
//@ chunk-sycgf9xs.js:18272-22243 sole-consumer
async function execFileCore(
  file,
  args,
  {
    abortSignal: abortSignal,
    timeout: timeoutMs = 10 * Q * q,
    preserveOutputOnError: preserveOutputOnError = !0,
    cwd: cwd,
    env: envOverrides,
    extendEnv: extendEnv,
    maxBuffer: maxBuffer,
    shell: shell,
    stdin: stdin,
    input: input,
    stdout: stdout,
    stderr: stderr,
    stripFinalNewline: stripFinalNewline,
    encoding: encoding,
    allowRepoGitHooks: allowRepoGitHooks,
    allowGitTerminalPrompt: allowGitTerminalPrompt,
    gitStartsIn: gitStartsIn,
    useToolMemoryCgroup: useToolMemoryCgroup = !0,
    toolCgroupClass: toolCgroupClass = "helper",
    waitForExitAfterKill: waitForExitAfterKill = !1,
    onStdoutData: onStdoutData,
    inheritFd: inheritFd,
    withoutControllingTerminal: withoutControllingTerminal = !1,
    tellBeforeKill: D,
    abortEndsProcessGroup: ze = !1,
  } = { timeout: 10 * Q * q, preserveOutputOnError: !0, maxBuffer: 1e6 },
) {
  if (Tv()) return { stdout: "", stderr: ije, code: 126, error: ije };
  let b = file,
    env_2 = process.env,
    _ = buildSafeGitInvocation(
      b,
      args,
      envOverrides === void 0 ? env_2 : extendEnv === !1 ? envOverrides : { ...env_2, ...envOverrides },
      envOverrides && "GIT_CONFIG_COUNT" in envOverrides
        ? envOverrides.GIT_CONFIG_COUNT
        : env.GIT_CONFIG_COUNT,
      { allowRepoGitHooks: allowRepoGitHooks, allowGitTerminalPrompt: allowGitTerminalPrompt },
    );
  if (_ !== null && fje(b, _.env))
    return { stdout: "", stderr: GIT_MISSING_MAC_MESSAGE, code: 127, error: GIT_MISSING_MAC_MESSAGE };
  let w =
    _ !== null && gitStartsIn instanceof GitStartFolderError && cwd !== void 0
      ? buildGitInvocation(gitStartsIn, cwd, _.args, _.env)
      : null;
  if (_ !== null && envOverrides?.[CLAUDE_CODE_FOUND_REPOSITORY_GIT] !== void 0 && w === null) {
    let a = `${basename(file)} was not started: a found repository's git must start outside the repository's folder`;
    return (logForDebugging(a, { level: "error" }), { stdout: "", stderr: a, code: 1, error: a });
  }
  let qe = w?.args ?? _?.args ?? args,
    Qe = w?.cwd ?? cwd,
    B = w?.env ?? _?.env ?? envOverrides,
    U = withoutControllingTerminal && getPlatform() !== "windows";
  if (U && isCleanupStarted()) {
    let a = `${basename(file)} was not started because Claude Code was exiting; try again after it restarts`;
    return { stdout: "", stderr: a, code: 1, error: a };
  }
  let p,
    R,
    se,
    ue,
    ce,
    H = D !== void 0 && abortSignal !== void 0 ? new AbortController() : void 0,
    W,
    de = getPlatform() === "linux" ? { noChildLeft: !0 } : {},
    F = de,
    ae,
    T = encoding === "utf8-keep-bom" ? (maxBuffer ?? un) : void 0;
  try {
    let a = WMt(b, qe, {
      signal: H?.signal ?? abortSignal,
      timeout: timeoutMs,
      cwd: Qe,
      env: B,
      shell: shell,
      ...(inheritFd === void 0
        ? {
            stdin: stdin,
            ...(stdout === void 0 ? {} : { stdout: stdout }),
            ...(stderr === void 0 ? {} : { stderr: stderr }),
          }
        : { stdio: [stdin, stdout, stderr, inheritFd] }),
      ...(T !== void 0
        ? { maxBuffer: Math.min(T * sn, constants.MAX_STRING_LENGTH) }
        : maxBuffer === void 0
          ? {}
          : { maxBuffer: maxBuffer }),
      ...(stripFinalNewline === void 0 ? {} : { stripFinalNewline: stripFinalNewline }),
      ...(encoding !== void 0 && encoding !== "utf8" && { encoding: "latin1" }),
      ...(w !== null ? { extendEnv: !1 } : extendEnv === void 0 ? {} : { extendEnv: extendEnv }),
      ...(useToolMemoryCgroup ? Nd(toolCgroupClass) : {}),
      ...(U && { detached: !0 }),
      reject: !1,
    });
    if (
      ((F = a.pid === void 0 ? de : {}),
      D !== void 0 && abortSignal !== void 0 && H !== void 0 && a.pid !== void 0)
    )
      ue = scheduleGracefulAbort(a, a.pid, abortSignal, D, H);
    if (((R = U ? a.pid : void 0), R !== void 0)) {
      let E = R;
      if (ze && abortSignal !== void 0) ce = killProcessGroupOnAbort(a, E, abortSignal);
      let O = () => killProcessGroup(E),
        V = registerCleanup(O),
        P = onExit(O, { alwaysLast: !0 });
      se = () => {
        (V(), P());
      };
    }
    if (
      (a.once("error", (E) => {
        ae = E;
      }),
      (W = input === void 0 ? void 0 : watchStdinErrors(a)),
      input !== void 0 && a.pid !== void 0)
    )
      a.stdin?.end(input);
    if (onStdoutData && a.pid !== void 0)
      a.stdout?.on("data", (E) => {
        try {
          onStdoutData(E.toString());
        } catch (error) {
          logError(error);
        }
      });
    if (
      ((p = await a),
      waitForExitAfterKill && p.exitCode === void 0 && (abortSignal?.aborted === !0 || p.timedOut))
    )
      await waitForChildExit(a, Kt);
  } catch (error) {
    let { message: message, shortMessage: shortMessage, originalMessage: originalMessage } = error,
      P =
        shortMessage === void 0
          ? message
          : (originalMessage ?? "the spawn threw a value that is not an Error");
    if (isSyscallError(error))
      return (
        logForDebugging(`execFileNoThrow spawn failed: ${getErrnoCode(error)} ${P}`, { level: "error" }),
        { stdout: "", stderr: "", code: 1, ...F }
      );
    else if (isMaxBufferError(error))
      return (
        logForDebugging(`execFileNoThrow maxBuffer exceeded: ${P}`, { level: "error" }),
        { stdout: "", stderr: "", code: 1, maxBufferExceeded: !0 }
      );
    else {
      let env = process.env,
        A =
          getErrnoCode(error) === "ERR_INVALID_ARG_VALUE"
            ? describeNullByteSpawnError(
                b,
                args,
                cwd,
                B,
                extendEnv === !1 && B !== void 0 ? void 0 : env,
                env,
              )
            : void 0;
      if (A) logForDebugging(`execFileNoThrow spawn refused: ${A.local}`, { level: "error" });
      let me = toError(error);
      logError(
        withTelemetryMessage(
          A === void 0 && shortMessage === void 0 ? me : shortErrorStack(me, A?.telemetry ?? P),
          A?.telemetry ?? "execFileNoThrow unexpected rejection",
        ),
      );
    }
    return { stdout: "", stderr: "", code: 1 };
  } finally {
    if ((ue?.(), ce?.(), se?.(), R !== void 0 && (p === void 0 || p.exitCode === void 0)))
      killProcessGroup(R);
  }
  if (W?.truncatedBy !== void 0) {
    let a = `stdin write failed: ${W.truncatedBy}`;
    return (
      logForDebugging(`execFileNoThrow ${a}`, { level: "error" }),
      { stdout: "", stderr: "", code: 1, error: a }
    );
  }
  let G = decodeOutput(p.stdout, encoding),
    L = decodeOutput(p.stderr, encoding);
  if (T !== void 0 && (G.length > T || L.length > T))
    return preserveOutputOnError
      ? {
          stdout: G.slice(0, T),
          stderr: L.slice(0, T),
          code: 1,
          error: `Command failed: ${p.command}
maxBuffer exceeded`,
          maxBufferExceeded: !0,
        }
      : { stdout: "", stderr: "", code: 1, maxBufferExceeded: !0 };
  if (!p.failed) return { stdout: G, stderr: L, code: 0, exitCode: 0 };
  let le = isMaxBufferError(p) ? { maxBufferExceeded: !0 } : {},
    fe = p.timedOut ? { timedOut: !0 } : {};
  if (!preserveOutputOnError)
    return { stdout: "", stderr: "", code: p.exitCode ?? 1, exitCode: p.exitCode, ...le, ...fe, ...F };
  let pe = p.exitCode ?? 1;
  return {
    stdout: G,
    stderr: L,
    code: pe,
    error: spawnFailureMessage(p, ae) ?? getErrorMessage(p, pe),
    exitCode: p.exitCode,
    ...le,
    ...fe,
    ...F,
  };
}
/**
 * 在指定目录运行 git（带固定前置参数），成功返回去空白的 stdout，失败/非零返回 undefined。
 */
//@ chunk-s61vbvea.js:531652-531881 fingerprint = execFileNoThrowWithCwd (0.521)
async function execGitNoThrow(file, args, r) {
  try {
    let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(gitExe(), [...freeze_7, ...args], {
      cwd: file,
      timeout: USr,
      maxBuffer: 1e5,
      abortSignal: r,
      preserveOutputOnError: !1,
      useToolMemoryCgroup: !1,
    });
    if (code !== 0) return;
    return stdout.trim() || void 0;
  } catch {
    return;
  }
}
/**
 * 已有目录状态缓存时直接取 branch，否则 git rev-parse --abbrev-ref HEAD。
 */
//@ chunk-s61vbvea.js:531881-532001 affinity
async function getGitBranchForDir(e, n, r) {
  if (e.hasDir(n)) return e.dirState(n)?.branch;
  return execGitNoThrow(n, ["rev-parse", "--abbrev-ref", "HEAD"], r);
}

export {
  execFileNoThrowWithCwd,
  execFileNoThrow,
  execSyncWithDefaults_BLOCKS_EVENT_LOOP_WILL_FREEZE_UI_MAKE_SURE_YOU_KNOW_WHAT_YOU_ARE_DOING,
  INHERITED_FD_PATH,
  execGitNoThrow,
  getGitBranchForDir,
};
