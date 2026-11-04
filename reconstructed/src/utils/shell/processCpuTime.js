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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function readProcessResourceUsage(processObject) {
  try {
    if (getPlatform() === "windows") return;
    let found = Object.getOwnPropertySymbols(Object.getPrototypeOf(processObject)).find(
      (symbol) => symbol.description === "kHandle",
    );
    let handle = found === undefined ? undefined : Reflect.get(processObject, found);
    if (
      typeof handle !== "object" ||
      handle === null ||
      !("resourceUsage" in handle) ||
      typeof handle.resourceUsage !== "function"
    )
      return;
    let usage = handle.resourceUsage();
    if (
      typeof usage !== "object" ||
      usage === null ||
      !("cpuTime" in usage) ||
      typeof usage.cpuTime !== "object" ||
      usage.cpuTime === null ||
      !("user" in usage.cpuTime) ||
      !("system" in usage.cpuTime)
    )
      return;
    let userMs = Number(usage.cpuTime.user) / 1000;
    let systemMs = Number(usage.cpuTime.system) / 1000;
    return Number.isFinite(userMs) && Number.isFinite(systemMs) && userMs + systemMs > 0
      ? {
          userMs,
          systemMs,
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
var CPU_SAMPLE_COUNT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROC_SCAN_BUDGET_MS;
var MAX_PROC_ENTRIES;
var IGNORED_PROC_ERRNOS;
var BACKGROUND_JOB_RE;
deferInit("chunk-e6aww6q8.js:246042", () => {
  CPU_SAMPLE_COUNT = 10;
  PROC_SCAN_BUDGET_MS = 250;
  MAX_PROC_ENTRIES = 2000;
  IGNORED_PROC_ERRNOS = new Set(["ENOENT", "ESRCH", "EACCES", "EPERM"]);
  BACKGROUND_JOB_RE = /(?:^|[^&><|\\])&(?:\s|$|[;)}'"`])|\bset\s+-(?:m\b|o\s+monitor\b)/;
});
//@ chunk-e6aww6q8.js:246190-246225 placement
function isBackgroundJobCommand(command) {
  return BACKGROUND_JOB_RE.test(command);
}
//@ chunk-e6aww6q8.js:246275-246352 placement
function pushToGroup(groups, groupId, pid) {
  let group = groups.get(groupId);
  if (group === undefined) groups.set(groupId, [pid]);
  else group.push(pid);
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
    let seen = new Set();
    let pending = [pid, ...(latest.ledBy.get(pid) ?? [])];
    let totalTicks;
    for (let currentPid = pending.pop(); currentPid !== undefined; currentPid = pending.pop()) {
      if (seen.has(currentPid)) continue;
      seen.add(currentPid);
      let ticks = latest.ticksOf.get(currentPid);
      if (ticks !== undefined) totalTicks = (totalTicks ?? 0) + ticks;
      pending.push(...(latest.childrenOf.get(currentPid) ?? []));
    }
    return totalTicks === undefined ? undefined : totalTicks * CPU_SAMPLE_COUNT;
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
var cpuWindowState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:247793", () => {
  cpuWindowState = identity_2(
    {
      open: 0,
      opened: 0,
      noWindowSince: undefined,
      noWindow: {
        cpuMs: 0,
        wallMs: 0,
      },
    },
    (state) => {
      state.open = 0;
      state.opened = 0;
      state.noWindowSince = undefined;
      state.noWindow = {
        cpuMs: 0,
        wallMs: 0,
      };
    },
  );
});
//@ chunk-e6aww6q8.js:247951-248149 placement
function updateNoWindowSpan(lastSample, hasWindow) {
  if (lastSample !== undefined && cpuWindowState.noWindowSince !== undefined) {
    cpuWindowState.noWindow.cpuMs += Math.max(0, lastSample.cpuMs - cpuWindowState.noWindowSince.cpuMs);
    cpuWindowState.noWindow.wallMs += lastSample.atMs - cpuWindowState.noWindowSince.atMs;
  }
  cpuWindowState.noWindowSince = hasWindow ? lastSample : undefined;
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
  let taskListEmpty;
  try {
    taskListEmpty = readFileSync(posix.join(cpuacctDirForMetering, "tasks"), "utf8") === "";
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
    sharedAtOpen: cpuWindowState.open > 1 || taskListEmpty !== true,
    onlyLeftRunningAtOpen: cpuWindowState.open === 1 && taskListEmpty === false,
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
function releaseCpuWindow(cpuWindow, finalSeconds) {
  cpuWindow.held = false;
  if (!cpuWindow.closed || cpuWindow.released) return;
  cpuWindow.released = true;
  cpuWindowState.open--;
  if (cpuWindowState.open === 0) {
    let endSeconds = finalSeconds ?? readCpuUsageSeconds(cpuWindow.usageFile);
    cpuWindowState.noWindowSince =
      endSeconds === undefined
        ? undefined
        : {
            cpuMs: endSeconds,
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
  let endSeconds =
    cpuAccountWindow.join === "certain" ? readCpuUsageSeconds(cpuAccountWindow.usageFile) : undefined;
  let reopened = cpuWindowState.opened !== cpuAccountWindow.sequence;
  if (!cpuAccountWindow.held) releaseCpuWindow(cpuAccountWindow, endSeconds);
  return endSeconds === undefined
    ? undefined
    : {
        cpuMs: Math.max(0, endSeconds - cpuAccountWindow.openedAtMs),
        shared: cpuAccountWindow.sharedAtOpen || reopened,
        sharedWithLeftRunningOnly: cpuAccountWindow.onlyLeftRunningAtOpen && !reopened,
      };
}
//@ chunk-e6aww6q8.js:249328-249472 placement
/**
 * 读取 /proc/<pid>/stat 中的父进程、进程组、启动标记与是否已退出。
 */
function readProcessInfo(pid) {
  let statContent;
  try {
    statContent = readFileSync(`/proc/${pid}/stat`, "utf8");
  } catch {
    return;
  }
  return {
    pid,
    ppid: statPpid(statContent),
    pgrp: statPgrp(statContent),
    startToken: procStatField(statContent),
    exited: isMinorFaultField(statState(statContent)),
  };
}
//@ chunk-e6aww6q8.js:249472-249701 placement
/**
 * 列出 /proc 中所有进程的信息（需确认 /proc/self 指向本进程）。
 */
function listProcessInfos() {
  let names;
  try {
    if (readlinkSync("/proc/self") !== String(process.pid)) return;
    names = readdirSync("/proc");
  } catch {
    return;
  }
  let processInfos = [];
  for (let name of names) {
    if (!/^\d+$/.test(name)) continue;
    let processInfo = readProcessInfo(Number(name));
    if (processInfo !== undefined) processInfos.push(processInfo);
  }
  return processInfos.length > 0 ? processInfos : undefined;
}
//@ chunk-e6aww6q8.js:249701-249765 placement
var UNLISTED_SHELL_GRACE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SWEEP_WAIT_STEP_MS;
var int32Array;
deferInit("chunk-e6aww6q8.js:249701", () => {
  UNLISTED_SHELL_GRACE_MS = 250;
  SWEEP_WAIT_STEP_MS = 10;
  int32Array = new Int32Array(new SharedArrayBuffer(4));
});
//@ chunk-e6aww6q8.js:249765-249805 placement
function sleepBlocking(timeoutMs) {
  Atomics.wait(int32Array, 0, 0, timeoutMs);
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
function tryKillProcess(pid, signal) {
  try {
    return process.kill(pid, signal);
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
