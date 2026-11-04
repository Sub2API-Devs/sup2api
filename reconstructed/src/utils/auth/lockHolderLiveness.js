/**
 * utils/auth/lockHolderLiveness.ts
 *
 * 2.1.316 新增：带超时与中止的操作封装；列出进程的后代（可限定同会话）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (22)
 * attribution: placement 22
 */
import { spawn } from "child_process";
import { join } from "path";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../errors.js";
import { getProcessStartTokenLinuxSync, getWindowsProcessCreationTime } from "../processIdentity.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { isDisklessSession } from "../disklessSession.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { sleep } from "../sleep.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:314332-314368 placement
var lockHolderSocketSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:314332", () => {
  lockHolderSocketSlot = new HostScoped(() => ({
    socket: undefined,
  }));
});
//@ chunk-aepeg2w5.js:314663-314708 placement
/**
 * 清空锁持有者对应的 socket 记录。
 */
function clearLockHolderSocket() {
  lockHolderSocketSlot.of(getRootSession().host).socket = undefined;
}
//@ chunk-aepeg2w5.js:314708-314729 placement
/**
 * 什么都不做的异步函数（占位）。
 */
async function noopAsync() {}
//@ chunk-aepeg2w5.js:314729-314772 placement
/**
 * 取标识末尾 20 个字符（用于日志）。
 */
function tailOfId(key) {
  return key.trim().slice(-20);
}
//@ chunk-aepeg2w5.js:315082-315093 placement
/**
 * 杀死进程组的超时（500 毫秒）。
 */
var KILL_GROUP_TIMEOUT_MS = 500;
//@ chunk-aepeg2w5.js:315093-315216 placement
/**
 * 杀死进程组（返回被杀 pid）。
 */
function killProcessGroup(pid, signal = "SIGKILL") {
  if (!Number.isInteger(pid) || pid <= 1) return Promise.resolve(new Set());
  return killGroupAndDescendants(pid, signal).catch(() => new Set());
}
//@ chunk-aepeg2w5.js:315216-315408 placement
async function killGroupAndDescendants(pid, signal) {
  let descendants = await listDescendantPids(pid);
  try {
    process.kill(-pid, signal);
  } catch (error) {
    try {
      process.kill(pid, signal);
    } catch {}
    if (getErrnoCode(error) !== "ESRCH") logKillError("group_kill", error);
  }
  for (let childPid of descendants)
    try {
      process.kill(childPid, signal);
    } catch {}
  return descendants;
}
//@ chunk-aepeg2w5.js:315579-315775 placement
/**
 * 进程启动时间未变时才发送信号。
 */
async function killIfUnchanged(processes, signal) {
  if (processes.size === 0) return;
  let currentStarts;
  currentStarts = new Map();
  for (let key of processes.keys()) {
    let processStartTokenLinux = getProcessStartTokenLinuxSync(key);
    if (processStartTokenLinux !== undefined) currentStarts.set(key, processStartTokenLinux);
  }
  for (let [pid, startToken] of processes) {
    if (currentStarts.get(pid) !== startToken) continue;
    try {
      process.kill(pid, signal);
    } catch {}
  }
}
//@ chunk-aepeg2w5.js:315775-316101 placement
/**
 * 用 ps 读取进程启动时间。
 */
async function readProcessStartTimes(pids) {
  let starts = new Map();
  let { stdout } = await execFileNoThrowWithCwd("ps", ["-o", "pid=", "-o", "lstart=", "-p", pids.join(",")], {
    timeout: KILL_GROUP_TIMEOUT_MS,
    cwd: "/",
    env: {
      USER_TYPE: "external",
      NODE_ENV: "production",
      LC_ALL: "C",
      TZ: "UTC",
    },
    stripFinalNewline: false,
  });
  for (let line of stdout.split(`
`)) {
    let match = line.match(/^\s*(\d+)\s+(\S.*\S)\s*$/);
    if (match) starts.set(Number(match[1]), match[2]);
  }
  return starts;
}
//@ chunk-aepeg2w5.js:316101-316826 placement
/**
 * 列出进程的后代（可限定同会话）。
 */
async function listDescendantPids(
  pid,
  { sameSession } = {
    sameSession: false,
  },
) {
  if (isDisklessSession()) return new Set();
  let tableText;
  try {
    tableText = await Promise.race([
      readProcessTable(sameSession),
      new Promise((resolve) => {
        let timer = setTimeout((resolve) => resolve(""), KILL_GROUP_TIMEOUT_MS, resolve);
        if (typeof timer === "object") timer.unref();
      }),
    ]);
  } catch (error) {
    logKillError("enum_spawn", error);
    return new Set();
  }
  let childrenByParent = new Map();
  let sessionByPid = new Map();
  for (let line of tableText.split(`
`)) {
    let match = line.match(/^\s*(\d+)\s+(\d+)(?:\s+(\S+))?\s*$/);
    if (!match) continue;
    let childPid = Number(match[1]);
    let parentPid = Number(match[2]);
    if (match[3] !== undefined) sessionByPid.set(childPid, match[3]);
    let children = childrenByParent.get(parentPid);
    if (children) children.push(childPid);
    else childrenByParent.set(parentPid, [childPid]);
  }
  let rootSession = sessionByPid.get(pid);
  if (sameSession && (rootSession === undefined || new Set(sessionByPid.values()).size < 2)) return new Set();
  let found = new Set();
  let queue = [pid];
  while (queue.length > 0) {
    let current = queue.shift();
    for (let childPid of childrenByParent.get(current) ?? [])
      if (
        childPid > 1 &&
        childPid !== pid &&
        childPid !== process.pid &&
        !found.has(childPid) &&
        (!sameSession || sessionByPid.get(childPid) === rootSession)
      ) {
        found.add(childPid);
        queue.push(childPid);
      }
  }
  return found;
}
//@ chunk-aepeg2w5.js:316826-317137 placement
/**
 * 用 ps 读取 pid/ppid/会话表。
 */
function readProcessTable(sameSession) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      let sessionArgs = sameSession ? ["-o", getPlatform() === "macos" ? "sess=" : "sid="] : [];
      child = spawn("ps", ["-A", "-o", "pid=", "-o", "ppid=", ...sessionArgs], {
        cwd: "/",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
    } catch (error) {
      reject(error);
      return;
    }
    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.once("error", reject);
    child.once("close", () => resolve(output));
  });
}
//@ chunk-aepeg2w5.js:317137-317293 placement
function logKillError(stage, error) {
  try {
    let errnoCode = getErrnoCode(error);
    let errnoToken = sanitizeErrnoForTelemetry(error);
    logForDebugging(`killProcessTree ${stage} failed: ${errnoCode ?? error}`);
    logEvent("tengu_bash_tool_kill_error", {
      stage: fromEnum(stage),
      ...(errnoToken && {
        error_code: errnoToken,
      }),
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:317293-317691 placement
/**
 * 用 Bun.ant.windowsProcessList 列出子进程。
 */
function windowsChildProcesses(parentPid) {
  if (typeof Bun === "undefined" || typeof Bun.ant?.windowsProcessList !== "function") return;
  try {
    let processes = Bun.ant.windowsProcessList();
    if (processes === null) return;
    let windowsProcessCreationTime = getWindowsProcessCreationTime(parentPid);
    let children = [];
    for (let { pid, ppid, name } of processes) {
      if (ppid !== parentPid) continue;
      let childStart =
        windowsProcessCreationTime === undefined ? undefined : getWindowsProcessCreationTime(pid);
      if (
        windowsProcessCreationTime === undefined ||
        childStart === undefined ||
        childStart >= windowsProcessCreationTime
      )
        children.push({
          pid,
          name,
        });
    }
    return children;
  } catch (error) {
    logForDebugging(`[win32-process-tree] toolhelp walk failed: ${error}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-aepeg2w5.js:317691-317700 placement
/**
 * Windows 上允许出现的短暂进程 pid（4）。
 */
var TRANSIENT_WINDOWS_PIDS = 4;
//@ chunk-aepeg2w5.js:317700-318051 placement
/**
 * Windows 进程树快照。
 */
function windowsProcessTree() {
  if (typeof Bun === "undefined" || typeof Bun.ant?.windowsProcessList !== "function") return;
  let processes;
  try {
    processes = Bun.ant.windowsProcessList();
  } catch (error) {
    logForDebugging(`[win32-process-tree] toolhelp walk failed: ${error}`, {
      level: "error",
    });
    return;
  }
  if (processes === null) return;
  let mapped = processes.map(({ pid, name }) => ({
    pid,
    name,
  }));
  return [process.pid, TRANSIENT_WINDOWS_PIDS].every((pid) => mapped.some(({ pid: pid_2 }) => pid_2 === pid))
    ? mapped
    : undefined;
}
//@ chunk-aepeg2w5.js:318051-318597 placement
/**
 * 用 PowerShell/CIM 列出子进程。
 */
async function powershellChildProcesses(parentPid, powershellPath, timeout) {
  let result = await execFileNoThrowWithCwd(
    powershellPath,
    [
      "-NoProfile",
      "-NonInteractive",
      "-OutputFormat",
      "Text",
      "-Command",
      `$parent = Get-CimInstance Win32_Process -Filter 'ProcessId=${parentPid}'; Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentPid}' | Where-Object { $null -eq $parent -or $_.CreationDate -ge $parent.CreationDate } | ForEach-Object { [string]$_.ProcessId + '=' + $_.Name }`,
    ],
    {
      timeout,
    },
  );
  if (result.code !== 0) return;
  let children = [];
  for (let line of result.stdout.split(/\r?\n/)) {
    let match = /^(\d+)=(.+)$/.exec(line.trim());
    if (match)
      children.push({
        pid: Number(match[1]),
        name: match[2],
      });
  }
  return children;
}
//@ chunk-aepeg2w5.js:318597-318924 placement
/**
 * 等待 Windows 上出现指定名字的子进程。
 */
async function waitForWindowsChild(
  parentPid,
  processName,
  { powershellPath, timeoutMs = 2000, pollMs = 50 },
) {
  if (getPlatform() !== "windows" || !Number.isInteger(parentPid) || parentPid <= 0) return;
  let lower = processName.toLowerCase();
  let deadline = Date.now() + timeoutMs;
  for (;;) {
    let found = (
      windowsChildProcesses(parentPid) ??
      (await powershellChildProcesses(parentPid, powershellPath, Math.max(pollMs, deadline - Date.now())))
    )?.find((childProcess) => childProcess.name.toLowerCase() === lower);
    if (found !== undefined) return found.pid;
    if (Date.now() + pollMs >= deadline) return;
    await sleep(pollMs);
  }
}
//@ chunk-aepeg2w5.js:318924-319056 placement
var WINDOWS_SHELL_EXES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WINDOWS_PROCESS_LIST_TIMEOUT_MS;
deferInit("chunk-aepeg2w5.js:318924", () => {
  WINDOWS_SHELL_EXES = new Set([
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "bash.exe",
    "sh.exe",
    "python.exe",
    "pythonw.exe",
    "aws.exe",
    "node.exe",
  ]);
  WINDOWS_PROCESS_LIST_TIMEOUT_MS = 1500;
});
//@ chunk-aepeg2w5.js:319056-319830 placement
/**
 * 带超时与中止的操作封装。
 */
class TimedOperation {
  #n;
  #e;
  #t;
  #r;
  #o = () => void this.#i("abort");
  #s;
  #a;
  constructor(child, { timeoutMs, signal }) {
    this.#t = child;
    this.#r = signal;
    this.#a = registerCleanup(() => this.#i("shutdown"));
    this.#s = setTimeout(() => void this.#i("timeout"), timeoutMs);
    if (signal?.aborted) this.#o();
    else
      signal?.addEventListener("abort", this.#o, {
        once: true,
      });
  }
  get killReason() {
    return this.#n;
  }
  settle() {
    clearTimeout(this.#s);
    this.#a();
    this.#r?.removeEventListener("abort", this.#o);
  }
  #i(reason) {
    return (this.#e ??= this.#u(reason));
  }
  async #u(reason) {
    this.#n = reason;
    this.#t.stdout?.destroy();
    this.#t.stderr?.destroy();
    let pid = this.#t.pid;
    if (pid === undefined || this.#t.exitCode !== null || this.#t.signalCode !== null) return;
    try {
      await terminateProcessTree(this.#t, pid);
    } catch (error) {
      logForDebugging(
        `auth refresh: process-tree kill failed (${getErrnoCode(error) ?? "unknown"}); signalling the command only`,
        {
          level: "error",
        },
      );
      try {
        this.#t.kill("SIGTERM");
      } catch {}
    }
  }
}
//@ chunk-aepeg2w5.js:319830-319951 placement
async function terminateProcessTree(child, pid) {
  let descendants = await listDescendantProcesses(pid);
  for (let pid of descendants.reverse())
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  child.kill("SIGTERM");
}
//@ chunk-aepeg2w5.js:319951-320035 placement
/**
 * 列出全部后代进程（Windows 与其他平台分别处理）。
 */
async function listDescendantProcesses(pid) {
  return getPlatform() === "windows"
    ? windowsDescendants(pid)
    : [
        ...(await listDescendantPids(pid, {
          sameSession: true,
        })),
      ];
}
//@ chunk-aepeg2w5.js:320035-320397 placement
/**
 * Windows 上列出全部后代进程。
 */
async function windowsDescendants(rootPid) {
  let deadline = Date.now() + WINDOWS_PROCESS_LIST_TIMEOUT_MS;
  let powershellPath = join(
    env.SYSTEMROOT || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  let found = new Set();
  let queue = [rootPid];
  while (queue.length > 0) {
    let timeout = deadline - Date.now();
    if (timeout <= 0) break;
    let current = queue.shift();
    let children =
      windowsChildProcesses(current) ?? (await powershellChildProcesses(current, powershellPath, timeout));
    for (let { pid, name } of children ?? [])
      if (
        WINDOWS_SHELL_EXES.has(name.toLowerCase()) &&
        pid !== rootPid &&
        pid !== process.pid &&
        !found.has(pid)
      ) {
        found.add(pid);
        queue.push(pid);
      }
  }
  return [...found];
}
export {
  tailOfId,
  TimedOperation,
  noopAsync,
  killProcessGroup,
  lockHolderSocketSlot,
  clearLockHolderSocket,
  listDescendantProcesses,
  killIfUnchanged,
  waitForWindowsChild,
  windowsProcessTree,
};
