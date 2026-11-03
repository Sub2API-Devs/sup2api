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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "../errors.js";
import { getProcessStartTokenLinuxSync, getWindowsProcessCreationTime } from "../processIdentity.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { Tv } from "../disklessSession.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { sleep } from "../sleep.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { registerCleanup } from "../cleanupRegistry.js";

//@ chunk-aepeg2w5.js:314332-314368 placement
var lockHolderSocketSlot = new HostScoped(() => ({ socket: void 0 }));
//@ chunk-aepeg2w5.js:314663-314708 placement
function Nwi() {
  lockHolderSocketSlot.of(getRootSession().host).socket = void 0;
}
//@ chunk-aepeg2w5.js:314708-314729 placement
async function Uv() {}
//@ chunk-aepeg2w5.js:314729-314772 placement
function nge(e) {
  return e.trim().slice(-20);
}
//@ chunk-aepeg2w5.js:315082-315093 placement
var Hv = 500;
/**
 * 杀死进程组（返回被杀 pid）。
 */
//@ chunk-aepeg2w5.js:315093-315216 placement
function killProcessGroup(e, n = "SIGKILL") {
  if (!Number.isInteger(e) || e <= 1) return Promise.resolve(new Set());
  return killGroupAndDescendants(e, n).catch(() => new Set());
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
/**
 * 进程启动时间未变时才发送信号。
 */
//@ chunk-aepeg2w5.js:315579-315775 placement
async function killIfUnchanged(e, n) {
  if (e.size === 0) return;
  let r;
  r = new Map();
  for (let s of e.keys()) {
    let h = getProcessStartTokenLinuxSync(s);
    if (h !== void 0) r.set(s, h);
  }
  for (let [s, h] of e) {
    if (r.get(s) !== h) continue;
    try {
      process.kill(s, n);
    } catch {}
  }
}
/**
 * 用 ps 读取进程启动时间。
 */
//@ chunk-aepeg2w5.js:315775-316101 placement
async function readProcessStartTimes(e) {
  let n = new Map(),
    { stdout: stdout } = await execFileNoThrowWithCwd(
      "ps",
      ["-o", "pid=", "-o", "lstart=", "-p", e.join(",")],
      {
        timeout: Hv,
        cwd: "/",
        env: { USER_TYPE: "external", NODE_ENV: "production", LC_ALL: "C", TZ: "UTC" },
        stripFinalNewline: !1,
      },
    );
  for (let s of stdout.split(`
`)) {
    let match = s.match(/^\s*(\d+)\s+(\S.*\S)\s*$/);
    if (match) n.set(Number(match[1]), match[2]);
  }
  return n;
}
/**
 * 列出进程的后代（可限定同会话）。
 */
//@ chunk-aepeg2w5.js:316101-316826 placement
async function listDescendantPids(e, { sameSession: n } = { sameSession: !1 }) {
  if (Tv()) return new Set();
  let r;
  try {
    r = await Promise.race([
      readProcessTable(n),
      new Promise((R) => {
        let x = setTimeout((P) => P(""), Hv, R);
        if (typeof x === "object") x.unref();
      }),
    ]);
  } catch (error) {
    return (logKillError("enum_spawn", error), new Set());
  }
  let s = new Map(),
    h = new Map();
  for (let R of r.split(`
`)) {
    let match = R.match(/^\s*(\d+)\s+(\d+)(?:\s+(\S+))?\s*$/);
    if (!match) continue;
    let P = Number(match[1]),
      F = Number(match[2]);
    if (match[3] !== void 0) h.set(P, match[3]);
    let L = s.get(F);
    if (L) L.push(P);
    else s.set(F, [P]);
  }
  let y = h.get(e);
  if (n && (y === void 0 || new Set(h.values()).size < 2)) return new Set();
  let S = new Set(),
    w = [e];
  while (w.length > 0) {
    let R = w.shift();
    for (let x of s.get(R) ?? [])
      if (x > 1 && x !== e && x !== process.pid && !S.has(x) && (!n || h.get(x) === y)) (S.add(x), w.push(x));
  }
  return S;
}
/**
 * 用 ps 读取 pid/ppid/会话表。
 */
//@ chunk-aepeg2w5.js:316826-317137 placement
function readProcessTable(e) {
  return new Promise((n, r) => {
    let s;
    try {
      let y = e ? ["-o", getPlatform() === "macos" ? "sess=" : "sid="] : [];
      s = spawn("ps", ["-A", "-o", "pid=", "-o", "ppid=", ...y], {
        cwd: "/",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: !0,
      });
    } catch (error) {
      r(error);
      return;
    }
    let h = "";
    (s.stdout?.on("data", (y) => (h += y)), s.once("error", r), s.once("close", () => n(h)));
  });
}
//@ chunk-aepeg2w5.js:317137-317293 placement
function logKillError(e, n) {
  try {
    let r = getErrnoCode(n),
      s = sanitizeErrnoForTelemetry(n);
    (logForDebugging(`killProcessTree ${e} failed: ${r ?? n}`),
      logEvent("tengu_bash_tool_kill_error", { stage: fromEnum(e), ...(s && { error_code: s }) }));
  } catch {}
}
/**
 * 用 Bun.ant.windowsProcessList 列出子进程。
 */
//@ chunk-aepeg2w5.js:317293-317691 placement
function windowsChildProcesses(e) {
  if (typeof Bun > "u" || typeof Bun.ant?.windowsProcessList !== "function") return;
  try {
    let windowsProcessList = Bun.ant.windowsProcessList();
    if (windowsProcessList === null) return;
    let r = getWindowsProcessCreationTime(e),
      s = [];
    for (let { pid: pid, ppid: ppid, name: S } of windowsProcessList) {
      if (ppid !== e) continue;
      let w = r === void 0 ? void 0 : getWindowsProcessCreationTime(pid);
      if (r === void 0 || w === void 0 || w >= r) s.push({ pid: pid, name: S });
    }
    return s;
  } catch (error) {
    logForDebugging(`[win32-process-tree] toolhelp walk failed: ${error}`, { level: "error" });
    return;
  }
}
//@ chunk-aepeg2w5.js:317691-317700 placement
var DL = 4;
/**
 * Windows 进程树快照。
 */
//@ chunk-aepeg2w5.js:317700-318051 placement
function windowsProcessTree() {
  if (typeof Bun > "u" || typeof Bun.ant?.windowsProcessList !== "function") return;
  let e;
  try {
    e = Bun.ant.windowsProcessList();
  } catch (error) {
    logForDebugging(`[win32-process-tree] toolhelp walk failed: ${error}`, { level: "error" });
    return;
  }
  if (e === null) return;
  let mapped = e.map(({ pid: pid, name: s }) => ({ pid: pid, name: s }));
  return [process.pid, DL].every((r) => mapped.some(({ pid: pid }) => pid === r)) ? mapped : void 0;
}
/**
 * 用 PowerShell/CIM 列出子进程。
 */
//@ chunk-aepeg2w5.js:318051-318597 placement
async function powershellChildProcesses(e, n, r) {
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
    { timeout: r },
  );
  if (s.code !== 0) return;
  let h = [];
  for (let y of s.stdout.split(/\r?\n/)) {
    let match = /^(\d+)=(.+)$/.exec(y.trim());
    if (match) h.push({ pid: Number(match[1]), name: match[2] });
  }
  return h;
}
/**
 * 等待 Windows 上出现指定名字的子进程。
 */
//@ chunk-aepeg2w5.js:318597-318924 placement
async function waitForWindowsChild(
  e,
  n,
  { powershellPath: powershellPath, timeoutMs: timeoutMs = 2000, pollMs: pollMs = 50 },
) {
  if (getPlatform() !== "windows" || !Number.isInteger(e) || e <= 0) return;
  let lower = n.toLowerCase(),
    S = Date.now() + timeoutMs;
  for (;;) {
    let R = (
      windowsChildProcesses(e) ??
      (await powershellChildProcesses(e, powershellPath, Math.max(pollMs, S - Date.now())))
    )?.find((x) => x.name.toLowerCase() === lower);
    if (R !== void 0) return R.pid;
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
  ]),
  WINDOWS_PROCESS_LIST_TIMEOUT_MS = 1500;
/**
 * 带超时与中止的操作封装。
 */
//@ chunk-aepeg2w5.js:319056-319830 placement
class TimedOperation {
  #n;
  #e;
  #t;
  #r;
  #o = () => void this.#i("abort");
  #s;
  #a;
  constructor(e, { timeoutMs: n, signal: r }) {
    if (
      ((this.#t = e),
      (this.#r = r),
      (this.#a = registerCleanup(() => this.#i("shutdown"))),
      (this.#s = setTimeout(() => void this.#i("timeout"), n)),
      r?.aborted)
    )
      this.#o();
    else r?.addEventListener("abort", this.#o, { once: !0 });
  }
  get killReason() {
    return this.#n;
  }
  settle() {
    (clearTimeout(this.#s), this.#a(), this.#r?.removeEventListener("abort", this.#o));
  }
  #i(e) {
    return (this.#e ??= this.#u(e));
  }
  async #u(e) {
    ((this.#n = e), this.#t.stdout?.destroy(), this.#t.stderr?.destroy());
    let pid = this.#t.pid;
    if (pid === void 0 || this.#t.exitCode !== null || this.#t.signalCode !== null) return;
    try {
      await terminateProcessTree(this.#t, pid);
    } catch (error) {
      logForDebugging(
        `auth refresh: process-tree kill failed (${getErrnoCode(error) ?? "unknown"}); signalling the command only`,
        { level: "error" },
      );
      try {
        this.#t.kill("SIGTERM");
      } catch {}
    }
  }
}
//@ chunk-aepeg2w5.js:319830-319951 placement
async function terminateProcessTree(e, n) {
  let r = await Lf(n);
  for (let s of r.reverse())
    try {
      process.kill(s, "SIGTERM");
    } catch {}
  e.kill("SIGTERM");
}
//@ chunk-aepeg2w5.js:319951-320035 placement
async function Lf(e) {
  return getPlatform() === "windows"
    ? windowsDescendants(e)
    : [...(await listDescendantPids(e, { sameSession: !0 }))];
}
/**
 * Windows 上列出全部后代进程。
 */
//@ chunk-aepeg2w5.js:320035-320397 placement
async function windowsDescendants(e) {
  let n = Date.now() + WINDOWS_PROCESS_LIST_TIMEOUT_MS,
    r = join_6(env.SYSTEMROOT || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    s = new Set(),
    h = [e];
  while (h.length > 0) {
    let y = n - Date.now();
    if (y <= 0) break;
    let S = h.shift(),
      w = windowsChildProcesses(S) ?? (await powershellChildProcesses(S, r, y));
    for (let { pid: pid, name: x } of w ?? [])
      if (WINDOWS_SHELL_EXES.has(x.toLowerCase()) && pid !== e && pid !== process.pid && !s.has(pid))
        (s.add(pid), h.push(pid));
  }
  return [...s];
}

export {
  nge,
  TimedOperation,
  Uv,
  killProcessGroup,
  lockHolderSocketSlot,
  Nwi,
  Lf,
  killIfUnchanged,
  waitForWindowsChild,
  windowsProcessTree,
};
