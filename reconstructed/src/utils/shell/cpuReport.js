/**
 * utils/shell/cpuReport.ts
 *
 * 2.1.316 新增：CPU 报告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8v8kgcje.js (16)
 * attribution: placement 16
 */
import { readdir, readFile } from "fs/promises";
import { readFileSync, mkdirSync } from "fs";
import { posix } from "path";
import { getErrnoCode, errorMessage } from "../errors.js";
import { procStatField, isMinorFaultField, statState, statSession } from "../procStat.js";
import { logForDebugging } from "../debug.js";
import { identity } from "../identity.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";

//@ chunk-8v8kgcje.js:468-514 placement
var MAX_TRACKED_TOOL_ENTRIES = 10;
var MAX_PIDS_PER_GROUP = 16;
var PROC_READ_BATCH_SIZE = 64;
var _ = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-8v8kgcje.js:514-589 placement
function classifyProcessError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ESRCH" ? "gone" : "unknown";
}
//@ chunk-8v8kgcje.js:589-705 placement
function getProcessState(file, e) {
  let r = procStatField(file);
  if (r === undefined || r === "") return "unknown";
  if (r !== e || isMinorFaultField(statState(file))) return "gone";
  return "running";
}
//@ chunk-8v8kgcje.js:705-1138 placement
/**
 * 扫描 /proc 下各进程的 stat（分批并行），按进程组 id 收集仍在运行的进程（pid 与启动标记），每组有数量上限。
 */
async function findProcessesByPgid(n) {
  let e = new Map();
  if (n.size === 0) return e;
  let filtered = (await readdir("/proc")).filter((o) => /^[0-9]+$/.test(o));
  for (let o = 0; o < filtered.length; o += PROC_READ_BATCH_SIZE) {
    let results = await Promise.all(
      filtered
        .slice(o, o + PROC_READ_BATCH_SIZE)
        .map((s) => readFile(`/proc/${s}/stat`, "utf8").catch(() => "")),
    );
    for (let [s, l] of results.entries()) {
      let u = statSession(l);
      let f = procStatField(l);
      if (u === undefined || !n.has(u) || f === undefined || f === "" || isMinorFaultField(statState(l)))
        continue;
      let a = e.get(u) ?? [];
      if (a.length < MAX_PIDS_PER_GROUP) {
        a.push([Number(filtered[o + s]), f]);
        e.set(u, a);
      }
    }
  }
  return e;
}
//@ chunk-8v8kgcje.js:1138-1219 placement
/**
 * 进程组是否仍存活（kill(-pgid, 0) 成功或 EPERM 视为存活）。
 */
function isProcessGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-8v8kgcje.js:1219-1959 placement
/**
 * 记录 Bash 命令结束后遗留的后台进程：开启计数后按进程组扫描遗留进程并保存（有上限），统计仍在运行的进程组数量。
 */
class LeftoverProcessTracker {
  #n;
  #e = [];
  #t = new Set();
  enableCounting() {
    this.#n = Symbol("following");
  }
  isFollowing() {
    return this.#n !== undefined;
  }
  follows(n) {
    return (n === "turn" || n === "agent") && this.isFollowing();
  }
  countRunning() {
    let n = new Set(this.#t);
    for (let e of this.#e) if (hasLiveProcess(e)) n.add(e.pgid);
    return Math.min(n.size, MAX_TRACKED_TOOL_ENTRIES);
  }
  noteCommandLeftProcesses(n, e) {
    if (!this.isFollowing() || !_.test(e)) return Promise.resolve();
    let r = this.#n;
    this.#t.add(n);
    return findProcessesByPgid(new Set([n]))
      .then((processesByPgid) => {
        let i = processesByPgid.get(n);
        if (i?.some(([s]) => s === n)) return;
        if (i !== undefined && this.#n === r)
          this.#r({
            tool_use_id: e,
            pgid: n,
            processes: i,
          });
      })
      .catch(() => {})
      .finally(() => this.#t.delete(n));
  }
  #r(n) {
    this.#e = [...this.#e.filter((e) => e.tool_use_id !== n.tool_use_id && hasLiveProcess(e)), n].slice(
      -MAX_TRACKED_TOOL_ENTRIES,
    );
  }
  reset() {
    this.#e = [];
    this.#n = undefined;
    this.#t.clear();
  }
}
//@ chunk-8v8kgcje.js:1959-2103 placement
function hasLiveProcess({ processes }) {
  return processes.some(([e, r]) => {
    try {
      let file = readFileSync(`/proc/${e}/stat`, "utf8");
      return getProcessState(file, r) !== "gone";
    } catch (error) {
      return classifyProcessError(error) !== "gone";
    }
  });
}
//@ chunk-8v8kgcje.js:2103-2136 placement
/**
 * 按宿主缓存的遗留后台进程跟踪器，重置时清空记录。
 */
var leftoverProcessTracker = identity(new LeftoverProcessTracker(), (n) => n.reset());
//@ chunk-8v8kgcje.js:2243-2339 placement
var CC_SHELL = "cc-shell";
var cpuacctState = identity(
  {
    dir: undefined,
    joinCommand: undefined,
  },
  (n) => {
    n.dir = undefined;
    n.joinCommand = undefined;
  },
);
//@ chunk-8v8kgcje.js:2339-2471 placement
/**
 * 设置 cpuacct 目录，并生成把子进程加入该组的 shell 片段。
 */
function setCpuacctDir(cpuacctGroup) {
  cpuacctState.dir = cpuacctGroup;
  cpuacctState.joinCommand =
    cpuacctGroup === undefined
      ? undefined
      : `{ { \\builtin echo 0 >| ${shellQuoteArgs([posix.join(cpuacctGroup, "tasks")])}; } 2>/dev/null || :; }`;
}
//@ chunk-8v8kgcje.js:2471-2507 placement
/**
 * 取把子进程加入 cpuacct 组的 shell 片段。
 */
function getCpuacctJoinCommand() {
  return cpuacctState.joinCommand;
}
//@ chunk-8v8kgcje.js:2507-2535 placement
/**
 * 取当前 cpuacct 计量目录。
 */
function getCpuacctDir() {
  return cpuacctState.dir;
}
//@ chunk-8v8kgcje.js:2535-2568 placement
/**
 * Linux cpuacct 控制组的挂载根路径。
 */
var CPUACCT_ROOT = "/sys/fs/cgroup/cpuacct";
//@ chunk-8v8kgcje.js:2568-2692 placement
/**
 * 从 /proc/<pid>/cgroup 内容中取 cpuacct 控制组路径。
 */
function getCpuacctPath(n) {
  for (let line of n.split(`
`)) {
    let [, r, ...o] = line.split(":");
    if (r === "cpuacct" && o.length > 0) return o.join(":");
  }
  return;
}
//@ chunk-8v8kgcje.js:2692-3024 placement
/**
 * 在 cpuacct cgroup 下为 Bash 工具创建子组（路径须至少两段、不含 ..、非 cc- 结尾），已存在视为成功，失败记录后返回 undefined。
 */
function ensureCpuacctGroup(n, e = mkdirSync) {
  let filtered = n.split("/").filter(Boolean);
  if (filtered.length < 2 || filtered.at(-1)?.startsWith("cc-") || filtered.includes("..")) return;
  let joined = posix.join(CPUACCT_ROOT, n, CC_SHELL);
  try {
    e(joined);
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      logForDebugging(
        `Bash-tool CPU will not be measured separately, and nothing else changes: could not make the cpuacct group ${joined} (${getErrnoCode(error) ?? errorMessage(error)})`,
      );
      return;
    }
  }
  return joined;
}
//@ chunk-8v8kgcje.js:3024-3152 placement
/**
 * 读取 cpuacct.usage（纳秒）并转换为毫秒。
 */
function readCpuUsageSeconds(n) {
  try {
    let trimmed = readFileSync(n, "utf8").trim();
    let r = trimmed === "" ? Number.NaN : Number(trimmed);
    return Number.isFinite(r) ? r / 1e6 : undefined;
  } catch {
    return;
  }
}
export {
  leftoverProcessTracker,
  getCpuacctDir,
  readCpuUsageSeconds,
  isProcessGroupAlive,
  findProcessesByPgid,
  getCpuacctJoinCommand,
  getCpuacctPath,
  ensureCpuacctGroup,
  setCpuacctDir,
  CPUACCT_ROOT,
};
