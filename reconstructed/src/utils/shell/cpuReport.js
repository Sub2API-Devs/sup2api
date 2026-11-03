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
import { readFileSync, readFileSync as readFileSync_2, mkdirSync } from "fs";
import { posix, posix as posix_2 } from "path";
import { getErrnoCode, errorMessage } from "../errors.js";
import { kI, RY, statState, statSession } from "../procStat.js";
import { logForDebugging } from "../debug.js";
import { ge } from "../identity.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";

//@ chunk-8v8kgcje.js:468-514 placement
var m = 10,
  R = 16,
  g = 64,
  _ = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-8v8kgcje.js:514-589 placement
function w(n) {
  let e = getErrnoCode(n);
  return e === "ENOENT" || e === "ESRCH" ? "gone" : "unknown";
}
//@ chunk-8v8kgcje.js:589-705 placement
function getProcessState(n, e) {
  let r = kI(n);
  if (r === void 0 || r === "") return "unknown";
  if (r !== e || RY(statState(n))) return "gone";
  return "running";
}
/**
 * 扫描 /proc 下各进程的 stat（分批并行），按进程组 id 收集仍在运行的进程（pid 与启动标记），每组有数量上限。
 */
//@ chunk-8v8kgcje.js:705-1138 placement
async function findProcessesByPgid(n) {
  let e = new Map();
  if (n.size === 0) return e;
  let filtered = (await readdir("/proc")).filter((o) => /^[0-9]+$/.test(o));
  for (let o = 0; o < filtered.length; o += g) {
    let results = await Promise.all(
      filtered.slice(o, o + g).map((s) => readFile(`/proc/${s}/stat`, "utf8").catch(() => "")),
    );
    for (let [s, l] of results.entries()) {
      let u = statSession(l),
        f = kI(l);
      if (u === void 0 || !n.has(u) || f === void 0 || f === "" || RY(statState(l))) continue;
      let a = e.get(u) ?? [];
      if (a.length < R) (a.push([Number(filtered[o + s]), f]), e.set(u, a));
    }
  }
  return e;
}
//@ chunk-8v8kgcje.js:1138-1219 placement
function n2o(n) {
  try {
    return (process.kill(-n, 0), !0);
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
/**
 * 记录 Bash 命令结束后遗留的后台进程：开启计数后按进程组扫描遗留进程并保存（有上限），统计仍在运行的进程组数量。
 */
//@ chunk-8v8kgcje.js:1219-1959 placement
class LeftoverProcessTracker {
  #n;
  #e = [];
  #t = new Set();
  enableCounting() {
    this.#n = Symbol("following");
  }
  isFollowing() {
    return this.#n !== void 0;
  }
  follows(n) {
    return (n === "turn" || n === "agent") && this.isFollowing();
  }
  countRunning() {
    let n = new Set(this.#t);
    for (let e of this.#e) if (hasLiveProcess(e)) n.add(e.pgid);
    return Math.min(n.size, m);
  }
  noteCommandLeftProcesses(n, e) {
    if (!this.isFollowing() || !_.test(e)) return Promise.resolve();
    let r = this.#n;
    return (
      this.#t.add(n),
      findProcessesByPgid(new Set([n]))
        .then((o) => {
          let i = o.get(n);
          if (i?.some(([s]) => s === n)) return;
          if (i !== void 0 && this.#n === r) this.#r({ tool_use_id: e, pgid: n, processes: i });
        })
        .catch(() => {})
        .finally(() => this.#t.delete(n))
    );
  }
  #r(n) {
    this.#e = [...this.#e.filter((e) => e.tool_use_id !== n.tool_use_id && hasLiveProcess(e)), n].slice(-m);
  }
  reset() {
    ((this.#e = []), (this.#n = void 0), this.#t.clear());
  }
}
//@ chunk-8v8kgcje.js:1959-2103 placement
function hasLiveProcess({ processes: processes }) {
  return processes.some(([e, r]) => {
    try {
      let o = readFileSync(`/proc/${e}/stat`, "utf8");
      return getProcessState(o, r) !== "gone";
    } catch (error) {
      return w(error) !== "gone";
    }
  });
}
//@ chunk-8v8kgcje.js:2103-2136 placement
var OEt = ge(new LeftoverProcessTracker(), (n) => n.reset());
//@ chunk-8v8kgcje.js:2243-2339 placement
var CC_SHELL = "cc-shell",
  c = ge({ dir: void 0, joinCommand: void 0 }, (n) => {
    ((n.dir = void 0), (n.joinCommand = void 0));
  });
/**
 * 设置 cpuacct 目录，并生成把子进程加入该组的 shell 片段。
 */
//@ chunk-8v8kgcje.js:2339-2471 placement
function setCpuacctDir(n) {
  ((c.dir = n),
    (c.joinCommand =
      n === void 0
        ? void 0
        : `{ { \\builtin echo 0 >| ${shellQuoteArgs([posix_2.join(n, "tasks")])}; } 2>/dev/null || :; }`));
}
//@ chunk-8v8kgcje.js:2471-2507 placement
function VXs() {
  return c.joinCommand;
}
//@ chunk-8v8kgcje.js:2507-2535 placement
function i7n() {
  return c.dir;
}
//@ chunk-8v8kgcje.js:2535-2568 placement
var ghn = "/sys/fs/cgroup/cpuacct";
/**
 * 从 /proc/<pid>/cgroup 内容中取 cpuacct 控制组路径。
 */
//@ chunk-8v8kgcje.js:2568-2692 placement
function getCpuacctPath(n) {
  for (let e of n.split(`
`)) {
    let [, r, ...o] = e.split(":");
    if (r === "cpuacct" && o.length > 0) return o.join(":");
  }
  return;
}
/**
 * 在 cpuacct cgroup 下为 Bash 工具创建子组（路径须至少两段、不含 ..、非 cc- 结尾），已存在视为成功，失败记录后返回 undefined。
 */
//@ chunk-8v8kgcje.js:2692-3024 placement
function ensureCpuacctGroup(n, e = mkdirSync) {
  let filtered = n.split("/").filter(Boolean);
  if (filtered.length < 2 || filtered.at(-1)?.startsWith("cc-") || filtered.includes("..")) return;
  let joined = posix.join(ghn, n, CC_SHELL);
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
/**
 * 读取 cpuacct.usage（纳秒）并转换为毫秒。
 */
//@ chunk-8v8kgcje.js:3024-3152 placement
function readCpuUsageSeconds(n) {
  try {
    let trimmed = readFileSync_2(n, "utf8").trim(),
      r = trimmed === "" ? Number.NaN : Number(trimmed);
    return Number.isFinite(r) ? r / 1e6 : void 0;
  } catch {
    return;
  }
}

export {
  OEt,
  i7n,
  readCpuUsageSeconds,
  n2o,
  findProcessesByPgid,
  VXs,
  getCpuacctPath,
  ensureCpuacctGroup,
  setCpuacctDir,
  ghn,
};
