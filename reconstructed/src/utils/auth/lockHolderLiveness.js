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
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { registerCleanup } from "../cleanupRegistry.js";

//@ chunk-aepeg2w5.js:314332-314368 placement
var lockHolderSocketSlot = new HostScoped(() => ({
  socket: undefined,
}));
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
function tailOfId(e) {
  return e.trim().slice(-20);
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
function killProcessGroup(pid, n = "SIGKILL") {
  if (!Number.isInteger(pid) || pid <= 1) return Promise.resolve(new Set());
  return killGroupAndDescendants(pid, n).catch(() => new Set());
}
//@ chunk-aepeg2w5.js:315216-315408 placement
async function killGroupAndDescendants(e, n) {
  let r = await listDescendantPids(e);
  try {
    process.kill(-e, n);
  } catch (error) {
    try {
      process.kill(e, n);
    } catch {}
    if (getErrnoCode(error) !== "ESRCH") logKillError("group_kill", error);
  }
  for (let s of r)
    try {
      process.kill(s, n);
    } catch {}
  return r;
}
//@ chunk-aepeg2w5.js:315579-315775 placement
/**
 * 进程启动时间未变时才发送信号。
 */
async function killIfUnchanged(e, n) {
  if (e.size === 0) return;
  let r;
  r = new Map();
  for (let key of e.keys()) {
    let processStartTokenLinux = getProcessStartTokenLinuxSync(key);
    if (processStartTokenLinux !== undefined) r.set(key, processStartTokenLinux);
  }
  for (let [s, h] of e) {
    if (r.get(s) !== h) continue;
    try {
      process.kill(s, n);
    } catch {}
  }
}
//@ chunk-aepeg2w5.js:315775-316101 placement
/**
 * 用 ps 读取进程启动时间。
 */
async function readProcessStartTimes(e) {
  let n = new Map();
  let { stdout } = await execFileNoThrowWithCwd("ps", ["-o", "pid=", "-o", "lstart=", "-p", e.join(",")], {
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
    if (match) n.set(Number(match[1]), match[2]);
  }
  return n;
}
//@ chunk-aepeg2w5.js:316101-316826 placement
/**
 * 列出进程的后代（可限定同会话）。
 */
async function listDescendantPids(
  e,
  { sameSession: n } = {
    sameSession: false,
  },
) {
  if (isDisklessSession()) return new Set();
  let r;
  try {
    r = await Promise.race([
      readProcessTable(n),
      new Promise((resolve) => {
        let timer = setTimeout((P) => P(""), KILL_GROUP_TIMEOUT_MS, resolve);
        if (typeof timer === "object") timer.unref();
      }),
    ]);
  } catch (error) {
    logKillError("enum_spawn", error);
    return new Set();
  }
  let s = new Map();
  let h = new Map();
  for (let line of r.split(`
`)) {
    let match = line.match(/^\s*(\d+)\s+(\d+)(?:\s+(\S+))?\s*$/);
    if (!match) continue;
    let P = Number(match[1]);
    let F = Number(match[2]);
    if (match[3] !== undefined) h.set(P, match[3]);
    let L = s.get(F);
    if (L) L.push(P);
    else s.set(F, [P]);
  }
  let y = h.get(e);
  if (n && (y === undefined || new Set(h.values()).size < 2)) return new Set();
  let S = new Set();
  let w = [e];
  while (w.length > 0) {
    let R = w.shift();
    for (let x of s.get(R) ?? [])
      if (x > 1 && x !== e && x !== process.pid && !S.has(x) && (!n || h.get(x) === y)) {
        S.add(x);
        w.push(x);
      }
  }
  return S;
}
//@ chunk-aepeg2w5.js:316826-317137 placement
/**
 * 用 ps 读取 pid/ppid/会话表。
 */
function readProcessTable(e) {
  return new Promise((resolve, reject) => {
    let s;
    try {
      let y = e ? ["-o", getPlatform() === "macos" ? "sess=" : "sid="] : [];
      s = spawn("ps", ["-A", "-o", "pid=", "-o", "ppid=", ...y], {
        cwd: "/",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
    } catch (error) {
      reject(error);
      return;
    }
    let h = "";
    s.stdout?.on("data", (y) => (h += y));
    s.once("error", reject);
    s.once("close", () => resolve(h));
  });
}
//@ chunk-aepeg2w5.js:317137-317293 placement
function logKillError(e, error) {
  try {
    let errnoCode = getErrnoCode(error);
    let s = sanitizeErrnoForTelemetry(error);
    logForDebugging(`killProcessTree ${e} failed: ${errnoCode ?? error}`);
    logEvent("tengu_bash_tool_kill_error", {
      stage: fromEnum(e),
      ...(s && {
        error_code: s,
      }),
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:317293-317691 placement
/**
 * 用 Bun.ant.windowsProcessList 列出子进程。
 */
function windowsChildProcesses(e) {
  if (typeof Bun === "undefined" || typeof Bun.ant?.windowsProcessList !== "function") return;
  try {
    let n = Bun.ant.windowsProcessList();
    if (n === null) return;
    let windowsProcessCreationTime = getWindowsProcessCreationTime(e);
    let s = [];
    for (let { pid, ppid, name: S } of n) {
      if (ppid !== e) continue;
      let w = windowsProcessCreationTime === undefined ? undefined : getWindowsProcessCreationTime(pid);
      if (windowsProcessCreationTime === undefined || w === undefined || w >= windowsProcessCreationTime)
        s.push({
          pid,
          name: S,
        });
    }
    return s;
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
  let e;
  try {
    e = Bun.ant.windowsProcessList();
  } catch (error) {
    logForDebugging(`[win32-process-tree] toolhelp walk failed: ${error}`, {
      level: "error",
    });
    return;
  }
  if (e === null) return;
  let mapped = e.map(({ pid, name: s }) => ({
    pid,
    name: s,
  }));
  return [process.pid, TRANSIENT_WINDOWS_PIDS].every((r) => mapped.some(({ pid }) => pid === r))
    ? mapped
    : undefined;
}
//@ chunk-aepeg2w5.js:318051-318597 placement
/**
 * 用 PowerShell/CIM 列出子进程。
 */
async function powershellChildProcesses(e, n, timeout) {
  let s = await execFileNoThrowWithCwd(
    n,
    [
      "-NoProfile",
      "-NonInteractive",
      "-OutputFormat",
      "Text",
      "-Command",
      `$parent = Get-CimInstance Win32_Process -Filter 'ProcessId=${e}'; Get-CimInstance Win32_Process -Filter 'ParentProcessId=${e}' | Where-Object { $null -eq $parent -or $_.CreationDate -ge $parent.CreationDate } | ForEach-Object { [string]$_.ProcessId + '=' + $_.Name }`,
    ],
    {
      timeout,
    },
  );
  if (s.code !== 0) return;
  let h = [];
  for (let line of s.stdout.split(/\r?\n/)) {
    let match = /^(\d+)=(.+)$/.exec(line.trim());
    if (match)
      h.push({
        pid: Number(match[1]),
        name: match[2],
      });
  }
  return h;
}
//@ chunk-aepeg2w5.js:318597-318924 placement
/**
 * 等待 Windows 上出现指定名字的子进程。
 */
async function waitForWindowsChild(e, n, { powershellPath, timeoutMs = 2000, pollMs = 50 }) {
  if (getPlatform() !== "windows" || !Number.isInteger(e) || e <= 0) return;
  let lower = n.toLowerCase();
  let S = Date.now() + timeoutMs;
  for (;;) {
    let found = (
      windowsChildProcesses(e) ??
      (await powershellChildProcesses(e, powershellPath, Math.max(pollMs, S - Date.now())))
    )?.find((x) => x.name.toLowerCase() === lower);
    if (found !== undefined) return found.pid;
    if (Date.now() + pollMs >= S) return;
    await sleep(pollMs);
  }
}
//@ chunk-aepeg2w5.js:318924-319056 placement
var WINDOWS_SHELL_EXES = new Set([
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
var WINDOWS_PROCESS_LIST_TIMEOUT_MS = 1500;
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
  constructor(e, { timeoutMs, signal }) {
    this.#t = e;
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
  #i(e) {
    return (this.#e ??= this.#u(e));
  }
  async #u(e) {
    this.#n = e;
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
async function terminateProcessTree(e, pid) {
  let r = await listDescendantProcesses(pid);
  for (let s of r.reverse())
    try {
      process.kill(s, "SIGTERM");
    } catch {}
  e.kill("SIGTERM");
}
//@ chunk-aepeg2w5.js:319951-320035 placement
/**
 * 列出全部后代进程（Windows 与其他平台分别处理）。
 */
async function listDescendantProcesses(e) {
  return getPlatform() === "windows"
    ? windowsDescendants(e)
    : [
        ...(await listDescendantPids(e, {
          sameSession: true,
        })),
      ];
}
//@ chunk-aepeg2w5.js:320035-320397 placement
/**
 * Windows 上列出全部后代进程。
 */
async function windowsDescendants(e) {
  let n = Date.now() + WINDOWS_PROCESS_LIST_TIMEOUT_MS;
  let r = join(env.SYSTEMROOT || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  let s = new Set();
  let h = [e];
  while (h.length > 0) {
    let timeout = n - Date.now();
    if (timeout <= 0) break;
    let S = h.shift();
    let w = windowsChildProcesses(S) ?? (await powershellChildProcesses(S, r, timeout));
    for (let { pid, name: x } of w ?? [])
      if (WINDOWS_SHELL_EXES.has(x.toLowerCase()) && pid !== e && pid !== process.pid && !s.has(pid)) {
        s.add(pid);
        h.push(pid);
      }
  }
  return [...s];
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
