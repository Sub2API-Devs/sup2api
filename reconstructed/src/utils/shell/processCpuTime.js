/**
 * utils/shell/processCpuTime.ts
 *
 * 2.1.316 新增：进程 CPU 时间
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (22)
 * attribution: placement 22
 */
import { readdirSync, readFileSync, readlinkSync } from "fs";
import { posix } from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { TENGU_ZIPPY_HARBOR } from "../../services/api/withRetry.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode, isSyscallError } from "../errors.js";
import {
  parseStatCpu,
  statPpid,
  statPgrp,
  procStatField,
  isMinorFaultField,
  statState,
} from "../procStat.js";
import { latestDiagnosticsStore } from "../../screens/Doctor.js";
import { logError } from "../log.js";
import { identity as identity_2 } from "../identity.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { getCpuacctDir, readCpuUsageSeconds } from "./cpuReport.js";

//@ chunk-e6aww6q8.js:245160-245207 placement
/**
 * 读取 tengu_rosy_donut 开关，决定是否记录进程 CPU 时间。
 */
function isCpuAccountingEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_donut", true);
}
//@ chunk-e6aww6q8.js:245207-245245 placement
function killOnInterruptWhenNoBackground() {
  return isBackgroundTasksOff() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ZIPPY_HARBOR, false);
}
//@ chunk-e6aww6q8.js:245245-245987 placement
function readProcessResourceUsage(e) {
  try {
    if (getPlatform() === "windows") return;
    let found = Object.getOwnPropertySymbols(Object.getPrototypeOf(e)).find(
      (S) => S.description === "kHandle",
    );
    let r = found === undefined ? undefined : Reflect.get(e, found);
    if (
      typeof r !== "object" ||
      r === null ||
      !("resourceUsage" in r) ||
      typeof r.resourceUsage !== "function"
    )
      return;
    let s = r.resourceUsage();
    if (
      typeof s !== "object" ||
      s === null ||
      !("cpuTime" in s) ||
      typeof s.cpuTime !== "object" ||
      s.cpuTime === null ||
      !("user" in s.cpuTime) ||
      !("system" in s.cpuTime)
    )
      return;
    let h = Number(s.cpuTime.user) / 1000;
    let y = Number(s.cpuTime.system) / 1000;
    return Number.isFinite(h) && Number.isFinite(y) && h + y > 0
      ? {
          userMs: h,
          systemMs: y,
        }
      : undefined;
  } catch (error) {
    logForDebugging(
      `Could not read a shell command's CPU time, so telemetry leaves it out; the command itself is unaffected: ${errorMessage(error)}`,
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:246042-246190 placement
/**
 * 进程 CPU 统计常量：采样次数、扫描预算、进程数上限、可忽略的错误码与后台任务正则。
 */
var CPU_SAMPLE_COUNT = 10;
var PROC_SCAN_BUDGET_MS = 250;
var MAX_PROC_ENTRIES = 2000;
var IGNORED_PROC_ERRNOS = new Set(["ENOENT", "ESRCH", "EACCES", "EPERM"]);
var BACKGROUND_JOB_RE = /(?:^|[^&><|\\])&(?:\s|$|[;)}'"`])|\bset\s+-(?:m\b|o\s+monitor\b)/;
//@ chunk-e6aww6q8.js:246190-246225 placement
function isBackgroundJobCommand(command) {
  return BACKGROUND_JOB_RE.test(command);
}
//@ chunk-e6aww6q8.js:246275-246352 placement
function pushToGroup(e, n, pid) {
  let s = e.get(n);
  if (s === undefined) e.set(n, [pid]);
  else s.push(pid);
}
//@ chunk-e6aww6q8.js:246352-247010 placement
/**
 * 读取 /proc 下所有进程的 stat，建立 CPU ticks、父子关系与进程组/会话归属表；进程数超限或超时则放弃（返回 "gave up"），进程消失等错误忽略。
 */
function readProcessTree(budgetMs, maxProcesses) {
  let deadline = performance.now() + budgetMs;
  let tree = {
    ticksOf: new Map(),
    childrenOf: new Map(),
    ledBy: new Map(),
  };
  let filtered = readdirSync("/proc").map(Number).filter(Number.isInteger);
  for (let pid of filtered) {
    if (filtered.length > maxProcesses || performance.now() > deadline) {
      logForDebugging(
        `Gave up reading the CPU time of a shell command's processes from /proc after ${tree.ticksOf.size} of ${filtered.length} processes, so telemetry leaves it out; the command itself is unaffected`,
      );
      return "gave up";
    }
    let stat;
    try {
      stat = readFileSync(`/proc/${pid}/stat`, "latin1");
    } catch (error) {
      let errno = getErrnoCode(error);
      if (errno !== undefined && IGNORED_PROC_ERRNOS.has(errno)) continue;
      throw error;
    }
    let parsed = parseStatCpu(stat);
    if (parsed === undefined) continue;
    tree.ticksOf.set(pid, parsed.cpuTicks);
    pushToGroup(tree.childrenOf, parsed.ppid, pid);
    pushToGroup(tree.ledBy, parsed.pgrp, pid);
    pushToGroup(tree.ledBy, parsed.session, pid);
  }
  return tree;
}
//@ chunk-e6aww6q8.js:247010-247726 placement
function readProcCpuTime(pid, budgetMs = PROC_SCAN_BUDGET_MS, maxProcesses = MAX_PROC_ENTRIES) {
  try {
    let platform = getPlatform();
    if ((platform !== "linux" && platform !== "wsl") || pid <= 1) return;
    if (latestDiagnosticsStore.latest === undefined) {
      latestDiagnosticsStore.latest = "gave up";
      queueMicrotask(() => {
        latestDiagnosticsStore.latest = undefined;
      });
      latestDiagnosticsStore.latest = readProcessTree(budgetMs, maxProcesses);
    }
    let latest = latestDiagnosticsStore.latest;
    if (
      latest === "gave up" ||
      (latest.ticksOf.has(pid) && !latest.childrenOf.get(process.pid)?.includes(pid))
    )
      return;
    let y = new Set();
    let S = [pid, ...(latest.ledBy.get(pid) ?? [])];
    let w;
    for (let L = S.pop(); L !== undefined; L = S.pop()) {
      if (y.has(L)) continue;
      y.add(L);
      let G = latest.ticksOf.get(L);
      if (G !== undefined) w = (w ?? 0) + G;
      S.push(...(latest.childrenOf.get(L) ?? []));
    }
    return w === undefined ? undefined : w * CPU_SAMPLE_COUNT;
  } catch (error) {
    if (isSyscallError(error) && error.code !== "EMFILE") {
      logForDebugging(
        `Could not read /proc (${errorMessage(error)}) for the CPU time of a shell command's processes, so telemetry leaves it out; the command itself is unaffected`,
      );
      return;
    }
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:247793-247951 placement
var cpuWindowState = identity_2(
  {
    open: 0,
    opened: 0,
    noWindowSince: undefined,
    noWindow: {
      cpuMs: 0,
      wallMs: 0,
    },
  },
  (e) => {
    e.open = 0;
    e.opened = 0;
    e.noWindowSince = undefined;
    e.noWindow = {
      cpuMs: 0,
      wallMs: 0,
    };
  },
);
//@ chunk-e6aww6q8.js:247951-248149 placement
function updateNoWindowSpan(e, n) {
  if (e !== undefined && cpuWindowState.noWindowSince !== undefined) {
    cpuWindowState.noWindow.cpuMs += Math.max(0, e.cpuMs - cpuWindowState.noWindowSince.cpuMs);
    cpuWindowState.noWindow.wallMs += e.atMs - cpuWindowState.noWindowSince.atMs;
  }
  cpuWindowState.noWindowSince = n ? e : undefined;
}
//@ chunk-e6aww6q8.js:248149-248283 placement
/**
 * 取出并重置没有计量窗口期间的 CPU 用量。
 */
function takeNoWindowUsage(shellMs, atMs) {
  if (cpuWindowState.open === 0)
    updateNoWindowSpan(
      shellMs === undefined
        ? undefined
        : {
            cpuMs: shellMs,
            atMs,
          },
      true,
    );
  let noWindow = cpuWindowState.noWindow;
  cpuWindowState.noWindow = {
    cpuMs: 0,
    wallMs: 0,
  };
  return noWindow;
}
//@ chunk-e6aww6q8.js:248283-248323 placement
function getCpuacctDirForMetering() {
  return isCcsTenant() ? undefined : getCpuacctDir();
}
//@ chunk-e6aww6q8.js:248323-248752 placement
/**
 * 为一条 shell 命令打开 cpuacct 计量窗口：读取当前用量与任务列表，记录是否与其他窗口共享、是否只与遗留进程共享、序号等，用于结束时计算该命令的 CPU 时间。
 */
function openCpuWindow(cpuAccountJoin) {
  let cpuacctDirForMetering = getCpuacctDirForMetering();
  if (cpuacctDirForMetering === undefined) return;
  let joined = posix.join(cpuacctDirForMetering, "cpuacct.usage");
  let cpuUsageSeconds = readCpuUsageSeconds(joined);
  let h;
  try {
    h = readFileSync(posix.join(cpuacctDirForMetering, "tasks"), "utf8") === "";
  } catch {}
  if (cpuWindowState.open === 0)
    updateNoWindowSpan(
      cpuUsageSeconds === undefined
        ? undefined
        : {
            cpuMs: cpuUsageSeconds,
            atMs: performance.now(),
          },
      false,
    );
  cpuWindowState.open++;
  cpuWindowState.opened++;
  return {
    usageFile: joined,
    join: cpuUsageSeconds === undefined ? "uncertain" : cpuAccountJoin,
    openedAtMs: cpuUsageSeconds ?? 0,
    sharedAtOpen: cpuWindowState.open > 1 || h !== true,
    onlyLeftRunningAtOpen: cpuWindowState.open === 1 && h === false,
    sequence: cpuWindowState.opened,
    closed: false,
    held: false,
    released: false,
  };
}
//@ chunk-e6aww6q8.js:248752-248778 placement
function markCpuWindowHeld(cpuAccountWindow) {
  cpuAccountWindow.held = true;
}
//@ chunk-e6aww6q8.js:248778-248973 placement
/**
 * 释放 CPU 计量窗口；最后一个窗口关闭时开始记录无窗口期间。
 */
function releaseCpuWindow(e, n) {
  e.held = false;
  if (!e.closed || e.released) return;
  e.released = true;
  cpuWindowState.open--;
  if (cpuWindowState.open === 0) {
    let r = n ?? readCpuUsageSeconds(e.usageFile);
    cpuWindowState.noWindowSince =
      r === undefined
        ? undefined
        : {
            cpuMs: r,
            atMs: performance.now(),
          };
  }
}
//@ chunk-e6aww6q8.js:248973-249253 placement
/**
 * 关闭 CPU 计量窗口，返回本命令 CPU 时间及是否与其他命令共享。
 */
function closeCpuWindow(cpuAccountWindow) {
  if (cpuAccountWindow.closed) return;
  cpuAccountWindow.closed = true;
  let n = cpuAccountWindow.join === "certain" ? readCpuUsageSeconds(cpuAccountWindow.usageFile) : undefined;
  let r = cpuWindowState.opened !== cpuAccountWindow.sequence;
  if (!cpuAccountWindow.held) releaseCpuWindow(cpuAccountWindow, n);
  return n === undefined
    ? undefined
    : {
        cpuMs: Math.max(0, n - cpuAccountWindow.openedAtMs),
        shared: cpuAccountWindow.sharedAtOpen || r,
        sharedWithLeftRunningOnly: cpuAccountWindow.onlyLeftRunningAtOpen && !r,
      };
}
//@ chunk-e6aww6q8.js:249328-249472 placement
/**
 * 读取 /proc/<pid>/stat 中的父进程、进程组、启动标记与是否已退出。
 */
function readProcessInfo(e) {
  let n;
  try {
    n = readFileSync(`/proc/${e}/stat`, "utf8");
  } catch {
    return;
  }
  return {
    pid: e,
    ppid: statPpid(n),
    pgrp: statPgrp(n),
    startToken: procStatField(n),
    exited: isMinorFaultField(statState(n)),
  };
}
//@ chunk-e6aww6q8.js:249472-249701 placement
/**
 * 列出 /proc 中所有进程的信息（需确认 /proc/self 指向本进程）。
 */
function listProcessInfos() {
  let e;
  try {
    if (readlinkSync("/proc/self") !== String(process.pid)) return;
    e = readdirSync("/proc");
  } catch {
    return;
  }
  let n = [];
  for (let r of e) {
    if (!/^\d+$/.test(r)) continue;
    let processInfo = readProcessInfo(Number(r));
    if (processInfo !== undefined) n.push(processInfo);
  }
  return n.length > 0 ? n : undefined;
}
//@ chunk-e6aww6q8.js:249701-249765 placement
var UNLISTED_SHELL_GRACE_MS = 250;
var SWEEP_WAIT_STEP_MS = 10;
var int32Array = new Int32Array(new SharedArrayBuffer(4));
//@ chunk-e6aww6q8.js:249765-249805 placement
function sleepBlocking(e) {
  Atomics.wait(int32Array, 0, 0, e);
}
//@ chunk-e6aww6q8.js:249805-249874 placement
function isExitSweepEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_lantern", true);
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:249874-249937 placement
function tryKillProcess(e, n) {
  try {
    return process.kill(e, n);
  } catch {
    return false;
  }
}
export {
  isCpuAccountingEnabled,
  readProcessInfo,
  listProcessInfos,
  tryKillProcess,
  UNLISTED_SHELL_GRACE_MS,
  SWEEP_WAIT_STEP_MS,
  sleepBlocking,
  killOnInterruptWhenNoBackground,
  closeCpuWindow,
  readProcessResourceUsage,
  readProcCpuTime,
  markCpuWindowHeld,
  releaseCpuWindow,
  isExitSweepEnabled,
  getCpuacctDirForMetering,
  openCpuWindow,
  isBackgroundJobCommand,
  MAX_PROC_ENTRIES,
  takeNoWindowUsage,
};
