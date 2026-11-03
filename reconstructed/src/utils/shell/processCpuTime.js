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
import {
  readdirSync,
  readdirSync as readdirSync_2,
  readdirSync as readdirSync_3,
  readdirSync as readdirSync_4,
  readdirSync as readdirSync_5,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
  readlinkSync,
  readlinkSync as readlinkSync_2,
  readlinkSync as readlinkSync_3,
} from "fs";
import {
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
import { TENGU_ZIPPY_HARBOR } from "../../services/api/withRetry.js";
import { getPlatform } from "../platform.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode, isSyscallError } from "../errors.js";
import { parseStatCpu, statPpid, statPgrp, kI, RY, statState } from "../procStat.js";
import { O9 } from "../../screens/Doctor.js";
import { logError } from "../log.js";
import { ge } from "../identity.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { i7n, readCpuUsageSeconds } from "./cpuReport.js";

//@ chunk-e6aww6q8.js:245160-245207 placement
function z_e() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_donut", !0);
}
//@ chunk-e6aww6q8.js:245207-245245 placement
function zCt() {
  return uf() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ZIPPY_HARBOR, !1);
}
//@ chunk-e6aww6q8.js:245245-245987 placement
function readProcessResourceUsage(e) {
  try {
    if (getPlatform() === "windows") return;
    let found = Object.getOwnPropertySymbols(Object.getPrototypeOf(e)).find(
        (S) => S.description === "kHandle",
      ),
      r = found === void 0 ? void 0 : Reflect.get(e, found);
    if (
      typeof r !== "object" ||
      r === null ||
      !("resourceUsage" in r) ||
      typeof r.resourceUsage !== "function"
    )
      return;
    let resourceUsage = r.resourceUsage();
    if (
      typeof resourceUsage !== "object" ||
      resourceUsage === null ||
      !("cpuTime" in resourceUsage) ||
      typeof resourceUsage.cpuTime !== "object" ||
      resourceUsage.cpuTime === null ||
      !("user" in resourceUsage.cpuTime) ||
      !("system" in resourceUsage.cpuTime)
    )
      return;
    let h = Number(resourceUsage.cpuTime.user) / 1000,
      y = Number(resourceUsage.cpuTime.system) / 1000;
    return Number.isFinite(h) && Number.isFinite(y) && h + y > 0 ? { userMs: h, systemMs: y } : void 0;
  } catch (error) {
    logForDebugging(
      `Could not read a shell command's CPU time, so telemetry leaves it out; the command itself is unaffected: ${errorMessage(error)}`,
    );
    return;
  }
}
/**
 * 进程 CPU 统计常量：采样次数、扫描预算、进程数上限、可忽略的错误码与后台任务正则。
 */
//@ chunk-e6aww6q8.js:246042-246190 placement
var CPU_SAMPLE_COUNT = 10,
  PROC_SCAN_BUDGET_MS = 250,
  MAX_PROC_ENTRIES = 2000,
  IGNORED_PROC_ERRNOS = new Set(["ENOENT", "ESRCH", "EACCES", "EPERM"]),
  BACKGROUND_JOB_RE = /(?:^|[^&><|\\])&(?:\s|$|[;)}'"`])|\bset\s+-(?:m\b|o\s+monitor\b)/;
//@ chunk-e6aww6q8.js:246190-246225 placement
function KCt(e) {
  return BACKGROUND_JOB_RE.test(e);
}
//@ chunk-e6aww6q8.js:246275-246352 placement
function nHe(e, n, r) {
  let s = e.get(n);
  if (s === void 0) e.set(n, [r]);
  else s.push(r);
}
/**
 * 读取 /proc 下所有进程的 stat，建立 CPU ticks、父子关系与进程组/会话归属表；进程数超限或超时则放弃（返回 "gave up"），进程消失等错误忽略。
 */
//@ chunk-e6aww6q8.js:246352-247010 placement
function readProcessTree(budgetMs, maxProcesses) {
  let deadline = performance.now() + budgetMs,
    tree = { ticksOf: new Map(), childrenOf: new Map(), ledBy: new Map() },
    filtered = readdirSync("/proc").map(Number).filter(Number.isInteger);
  for (let pid of filtered) {
    if (filtered.length > maxProcesses || performance.now() > deadline)
      return (
        logForDebugging(
          `Gave up reading the CPU time of a shell command's processes from /proc after ${tree.ticksOf.size} of ${filtered.length} processes, so telemetry leaves it out; the command itself is unaffected`,
        ),
        "gave up"
      );
    let stat;
    try {
      stat = readFileSync(`/proc/${pid}/stat`, "latin1");
    } catch (error) {
      let errno = getErrnoCode(error);
      if (errno !== void 0 && IGNORED_PROC_ERRNOS.has(errno)) continue;
      throw error;
    }
    let parsed = parseStatCpu(stat);
    if (parsed === void 0) continue;
    (tree.ticksOf.set(pid, parsed.cpuTicks),
      nHe(tree.childrenOf, parsed.ppid, pid),
      nHe(tree.ledBy, parsed.pgrp, pid),
      nHe(tree.ledBy, parsed.session, pid));
  }
  return tree;
}
//@ chunk-e6aww6q8.js:247010-247726 placement
function readProcCpuTime(e, n = PROC_SCAN_BUDGET_MS, r = MAX_PROC_ENTRIES) {
  try {
    let s = getPlatform();
    if ((s !== "linux" && s !== "wsl") || e <= 1) return;
    if (O9.latest === void 0)
      ((O9.latest = "gave up"),
        queueMicrotask(() => {
          O9.latest = void 0;
        }),
        (O9.latest = readProcessTree(n, r)));
    let latest = O9.latest;
    if (latest === "gave up" || (latest.ticksOf.has(e) && !latest.childrenOf.get(process.pid)?.includes(e)))
      return;
    let y = new Set(),
      S = [e, ...(latest.ledBy.get(e) ?? [])],
      w;
    for (let L = S.pop(); L !== void 0; L = S.pop()) {
      if (y.has(L)) continue;
      y.add(L);
      let G = latest.ticksOf.get(L);
      if (G !== void 0) w = (w ?? 0) + G;
      S.push(...(latest.childrenOf.get(L) ?? []));
    }
    return w === void 0 ? void 0 : w * CPU_SAMPLE_COUNT;
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
var cpuWindowState = ge(
  { open: 0, opened: 0, noWindowSince: void 0, noWindow: { cpuMs: 0, wallMs: 0 } },
  (e) => {
    ((e.open = 0), (e.opened = 0), (e.noWindowSince = void 0), (e.noWindow = { cpuMs: 0, wallMs: 0 }));
  },
);
//@ chunk-e6aww6q8.js:247951-248149 placement
function updateNoWindowSpan(e, n) {
  if (e !== void 0 && cpuWindowState.noWindowSince !== void 0)
    ((cpuWindowState.noWindow.cpuMs += Math.max(0, e.cpuMs - cpuWindowState.noWindowSince.cpuMs)),
      (cpuWindowState.noWindow.wallMs += e.atMs - cpuWindowState.noWindowSince.atMs));
  cpuWindowState.noWindowSince = n ? e : void 0;
}
/**
 * 取出并重置没有计量窗口期间的 CPU 用量。
 */
//@ chunk-e6aww6q8.js:248149-248283 placement
function takeNoWindowUsage(e, n) {
  if (cpuWindowState.open === 0) updateNoWindowSpan(e === void 0 ? void 0 : { cpuMs: e, atMs: n }, !0);
  let noWindow = cpuWindowState.noWindow;
  return ((cpuWindowState.noWindow = { cpuMs: 0, wallMs: 0 }), noWindow);
}
//@ chunk-e6aww6q8.js:248283-248323 placement
function rHe() {
  return isCcsTenant() ? void 0 : i7n();
}
/**
 * 为一条 shell 命令打开 cpuacct 计量窗口：读取当前用量与任务列表，记录是否与其他窗口共享、是否只与遗留进程共享、序号等，用于结束时计算该命令的 CPU 时间。
 */
//@ chunk-e6aww6q8.js:248323-248752 placement
function openCpuWindow(e) {
  let n = rHe();
  if (n === void 0) return;
  let joined = posix.join(n, "cpuacct.usage"),
    s = readCpuUsageSeconds(joined),
    h;
  try {
    h = readFileSync_2(posix.join(n, "tasks"), "utf8") === "";
  } catch {}
  if (cpuWindowState.open === 0)
    updateNoWindowSpan(s === void 0 ? void 0 : { cpuMs: s, atMs: performance.now() }, !1);
  return (
    cpuWindowState.open++,
    cpuWindowState.opened++,
    {
      usageFile: joined,
      join: s === void 0 ? "uncertain" : e,
      openedAtMs: s ?? 0,
      sharedAtOpen: cpuWindowState.open > 1 || h !== !0,
      onlyLeftRunningAtOpen: cpuWindowState.open === 1 && h === !1,
      sequence: cpuWindowState.opened,
      closed: !1,
      held: !1,
      released: !1,
    }
  );
}
//@ chunk-e6aww6q8.js:248752-248778 placement
function ZCt(e) {
  e.held = !0;
}
/**
 * 释放 CPU 计量窗口；最后一个窗口关闭时开始记录无窗口期间。
 */
//@ chunk-e6aww6q8.js:248778-248973 placement
function releaseCpuWindow(e, n) {
  if (((e.held = !1), !e.closed || e.released)) return;
  if (((e.released = !0), cpuWindowState.open--, cpuWindowState.open === 0)) {
    let r = n ?? readCpuUsageSeconds(e.usageFile);
    cpuWindowState.noWindowSince = r === void 0 ? void 0 : { cpuMs: r, atMs: performance.now() };
  }
}
/**
 * 关闭 CPU 计量窗口，返回本命令 CPU 时间及是否与其他命令共享。
 */
//@ chunk-e6aww6q8.js:248973-249253 placement
function closeCpuWindow(e) {
  if (e.closed) return;
  e.closed = !0;
  let n = e.join === "certain" ? readCpuUsageSeconds(e.usageFile) : void 0,
    r = cpuWindowState.opened !== e.sequence;
  if (!e.held) releaseCpuWindow(e, n);
  return n === void 0
    ? void 0
    : {
        cpuMs: Math.max(0, n - e.openedAtMs),
        shared: e.sharedAtOpen || r,
        sharedWithLeftRunningOnly: e.onlyLeftRunningAtOpen && !r,
      };
}
/**
 * 读取 /proc/<pid>/stat 中的父进程、进程组、启动标记与是否已退出。
 */
//@ chunk-e6aww6q8.js:249328-249472 placement
function readProcessInfo(e) {
  let n;
  try {
    n = readFileSync_3(`/proc/${e}/stat`, "utf8");
  } catch {
    return;
  }
  return { pid: e, ppid: statPpid(n), pgrp: statPgrp(n), startToken: kI(n), exited: RY(statState(n)) };
}
/**
 * 列出 /proc 中所有进程的信息（需确认 /proc/self 指向本进程）。
 */
//@ chunk-e6aww6q8.js:249472-249701 placement
function listProcessInfos() {
  let e;
  try {
    if (readlinkSync("/proc/self") !== String(process.pid)) return;
    e = readdirSync_2("/proc");
  } catch {
    return;
  }
  let n = [];
  for (let r of e) {
    if (!/^\d+$/.test(r)) continue;
    let s = readProcessInfo(Number(r));
    if (s !== void 0) n.push(s);
  }
  return n.length > 0 ? n : void 0;
}
//@ chunk-e6aww6q8.js:249701-249765 placement
var ico = 250,
  eAt = 10,
  int32Array = new Int32Array(new SharedArrayBuffer(4));
//@ chunk-e6aww6q8.js:249765-249805 placement
function pco(e) {
  Atomics.wait(int32Array, 0, 0, e);
}
//@ chunk-e6aww6q8.js:249805-249874 placement
function rAt() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_lantern", !0);
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:249874-249937 placement
function aHe(e, n) {
  try {
    return process.kill(e, n);
  } catch {
    return !1;
  }
}

export {
  z_e,
  readProcessInfo,
  listProcessInfos,
  aHe,
  ico,
  eAt,
  pco,
  zCt,
  closeCpuWindow,
  readProcessResourceUsage,
  readProcCpuTime,
  ZCt,
  releaseCpuWindow,
  rAt,
  rHe,
  openCpuWindow,
  KCt,
  MAX_PROC_ENTRIES,
  takeNoWindowUsage,
};
