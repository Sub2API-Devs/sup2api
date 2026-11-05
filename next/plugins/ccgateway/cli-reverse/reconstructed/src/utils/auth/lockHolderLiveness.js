/**
 * utils/auth/lockHolderLiveness.ts
 *
 * 2.1.316 新增：带超时与中止的操作封装；列出进程的后代（可限定同会话）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (23)
 * attribution: placement 21, layout 2
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
import { logError } from "../log.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:324581-324617 placement
var lockHolderSocketSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:324581", () => {
  lockHolderSocketSlot = new HostScoped(() => ({
    socket: undefined,
  }));
});
//@ chunk-exfmq47h.js:324912-324957 placement
/**
 * 清空锁持有者对应的 socket 记录。
 */
function clearLockHolderSocket() {
  lockHolderSocketSlot.of(getRootSession().host).socket = undefined;
}
//@ chunk-exfmq47h.js:324957-324978 placement
/**
 * 什么都不做的异步函数（占位）。
 */
async function noopAsync() {}
//@ chunk-exfmq47h.js:324978-325021 placement
/**
 * 取标识末尾 20 个字符（用于日志）。
 */
function tailOfId(key) {
  return key.trim().slice(-20);
}
//@ chunk-exfmq47h.js:325331-325342 placement
/**
 * 杀死进程组的超时（500 毫秒）。
 */
var KILL_GROUP_TIMEOUT_MS = 500;
//@ chunk-exfmq47h.js:325342-325498 placement
/**
 * 杀死进程组（返回被杀 pid）。
 */
function killProcessGroup(pid, signal = "SIGKILL", { groupMembersByPidToo = false } = {}) {
  if (!Number.isInteger(pid) || pid <= 1) return Promise.resolve(new Set());
  return killGroupAndDescendants(pid, signal, groupMembersByPidToo).catch(() => new Set());
}
//@ chunk-exfmq47h.js:325498-325765 placement
async function killGroupAndDescendants(pid, signal, groupMembersByPidToo) {
  let descendants = await processTableOfRoot(pid, false);
  let groupKilled = true;
  try {
    process.kill(-pid, signal);
  } catch (error) {
    groupKilled = false;
    try {
      process.kill(pid, signal);
    } catch {}
    if (getErrnoCode(error) !== "ESRCH") logKillError("group_kill", error);
  }
  for (let [childPid, parentPid] of descendants) {
    if (groupKilled && parentPid === pid && signal !== "SIGKILL" && !groupMembersByPidToo) continue;
    try {
      process.kill(childPid, signal);
    } catch {}
  }
  return new Set(descendants.keys());
}
//@ chunk-exfmq47h.js:325936-326132 placement
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
//@ chunk-exfmq47h.js:326132-326458 placement
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
//@ chunk-exfmq47h.js:326458-326551 layout
async function liveRootPids(
  rootPid,
  { sameSession } = {
    sameSession: false,
  },
) {
  return new Set((await processTableOfRoot(rootPid, sameSession)).keys());
}
//@ chunk-exfmq47h.js:326551-327280 layout
async function processTableOfRoot(rootPid, sameSession) {
  if (isDisklessSession()) return new Map();
  let processTable;
  try {
    processTable = await Promise.race([
      readProcessTable(sameSession),
      new Promise((resolve) => {
        let timer = setTimeout((resolve) => resolve(""), KILL_GROUP_TIMEOUT_MS, resolve);
        if (typeof timer === "object") timer.unref();
      }),
    ]);
  } catch (error) {
    logKillError("enum_spawn", error);
    return new Map();
  }
  let childrenByParent = new Map();
  let sessionByPid = new Map();
  for (let line of processTable.split(`
`)) {
    let match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)(?:\s+(\S+))?\s*$/);
    if (!match) continue;
    let childPid = Number(match[1]);
    let parentPid = Number(match[2]);
    let sessionId = Number(match[3]);
    if (match[4] !== undefined) sessionByPid.set(childPid, match[4]);
    let siblings = childrenByParent.get(parentPid);
    if (siblings) siblings.push([childPid, sessionId]);
    else childrenByParent.set(parentPid, [[childPid, sessionId]]);
  }
  let rootSession = sessionByPid.get(rootPid);
  if (sameSession && (rootSession === undefined || new Set(sessionByPid.values()).size < 2)) return new Map();
  let found = new Map();
  let queue = [rootPid];
  while (queue.length > 0) {
    let currentPid = queue.shift();
    for (let [childPid, sessionId] of childrenByParent.get(currentPid) ?? [])
      if (
        childPid > 1 &&
        childPid !== rootPid &&
        childPid !== process.pid &&
        !found.has(childPid) &&
        (!sameSession || sessionByPid.get(childPid) === rootSession)
      ) {
        found.set(childPid, sessionId);
        queue.push(childPid);
      }
  }
  return found;
}
//@ chunk-exfmq47h.js:327280-327609 placement
/**
 * 用 ps 读取 pid/ppid/会话表。
 */
function readProcessTable(sameSession) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      let sessionArgs = [
        "-o",
        "pid=",
        "-o",
        "ppid=",
        "-o",
        "pgid=",
        ...(sameSession ? ["-o", getPlatform() === "macos" ? "sess=" : "sid="] : []),
      ];
      child = spawn("ps", ["-A", ...sessionArgs], {
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
//@ chunk-exfmq47h.js:327609-327765 placement
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
//@ chunk-exfmq47h.js:327765-328163 placement
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
//@ chunk-exfmq47h.js:328163-328172 placement
/**
 * Windows 上允许出现的短暂进程 pid（4）。
 */
var TRANSIENT_WINDOWS_PIDS = 4;
//@ chunk-exfmq47h.js:328172-328523 placement
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
//@ chunk-exfmq47h.js:328523-329069 placement
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
//@ chunk-exfmq47h.js:329069-329396 placement
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
//@ chunk-exfmq47h.js:329396-329528 placement
var WINDOWS_SHELL_EXES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WINDOWS_PROCESS_LIST_TIMEOUT_MS;
deferInit("chunk-exfmq47h.js:329396", () => {
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
//@ chunk-exfmq47h.js:329528-330302 placement
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
//@ chunk-exfmq47h.js:330302-330423 placement
async function terminateProcessTree(child, pid) {
  let descendants = await listDescendantProcesses(pid);
  for (let pid of descendants.reverse())
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  child.kill("SIGTERM");
}
//@ chunk-exfmq47h.js:330423-330507 placement
/**
 * 列出全部后代进程（Windows 与其他平台分别处理）。
 */
async function listDescendantProcesses(pid) {
  return getPlatform() === "windows"
    ? windowsDescendants(pid)
    : [
        ...(await liveRootPids(pid, {
          sameSession: true,
        })),
      ];
}
//@ chunk-exfmq47h.js:330507-330869 placement
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
  killProcessGroup,
  windowsProcessTree,
  tailOfId,
  TimedOperation,
  noopAsync,
  killIfUnchanged,
  waitForWindowsChild,
  lockHolderSocketSlot,
  listDescendantProcesses,
  clearLockHolderSocket,
};
