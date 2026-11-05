/**
 * utils/shell/cpuReport.ts
 *
 * 2.1.316 新增：CPU 报告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2dvnfacg.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir, readFile } from "fs/promises";
import { readFileSync, mkdirSync } from "fs";
import { posix } from "path";
import { getErrnoCode, errorMessage } from "../errors.js";
import { procStatField, isMinorFaultField, statState, statSession } from "../procStat.js";
import { logForDebugging } from "../debug.js";
import { identity } from "../identity.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2dvnfacg.js:843-893 placement
var MAX_TRACKED_TOOL_ENTRIES = 10;
var MAX_PIDS_PER_GROUP = 16;
var PROC_READ_BATCH_SIZE = 64;
var TOOL_USE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-2dvnfacg.js:893-969 placement
function classifyProcessError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ESRCH" ? "gone" : "unknown";
}
//@ chunk-2dvnfacg.js:969-1085 placement
function getProcessState(file, expectedField) {
  let field = procStatField(file);
  if (field === undefined || field === "") return "unknown";
  if (field !== expectedField || isMinorFaultField(statState(file))) return "gone";
  return "running";
}
//@ chunk-2dvnfacg.js:1085-1522 placement
/**
 * 扫描 /proc 下各进程的 stat（分批并行），按进程组 id 收集仍在运行的进程（pid 与启动标记），每组有数量上限。
 */
async function findProcessesByPgid(pgids) {
  let processesByPgid = new Map();
  if (pgids.size === 0) return processesByPgid;
  let filtered = (await readdir("/proc")).filter((pidEntry) => /^[0-9]+$/.test(pidEntry));
  for (let batchStart = 0; batchStart < filtered.length; batchStart += PROC_READ_BATCH_SIZE) {
    let results = await Promise.all(
      filtered
        .slice(batchStart, batchStart + PROC_READ_BATCH_SIZE)
        .map((pid) => readFile(`/proc/${pid}/stat`, "utf8").catch(() => "")),
    );
    for (let [batchIndex, statContent] of results.entries()) {
      let sessionId = statSession(statContent);
      let pgidField = procStatField(statContent);
      if (
        sessionId === undefined ||
        !pgids.has(sessionId) ||
        pgidField === undefined ||
        pgidField === "" ||
        isMinorFaultField(statState(statContent))
      )
        continue;
      let groupProcesses = processesByPgid.get(sessionId) ?? [];
      if (groupProcesses.length < MAX_PIDS_PER_GROUP) {
        groupProcesses.push([Number(filtered[batchStart + batchIndex]), pgidField]);
        processesByPgid.set(sessionId, groupProcesses);
      }
    }
  }
  return processesByPgid;
}
//@ chunk-2dvnfacg.js:1522-1603 placement
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
//@ chunk-2dvnfacg.js:1603-2394 placement
/**
 * 记录 Bash 命令结束后遗留的后台进程：开启计数后按进程组扫描遗留进程并保存（有上限），统计仍在运行的进程组数量。
 */
class LeftoverProcessTracker {
  #e;
  #n = [];
  #t = new Set();
  enableCounting() {
    this.#e = Symbol("following");
  }
  isFollowing() {
    return this.#e !== undefined;
  }
  follows(source) {
    return (source === "turn" || source === "agent") && this.isFollowing();
  }
  countRunning(pgids = this.followedSessions()) {
    return Math.min(pgids.size, MAX_TRACKED_TOOL_ENTRIES);
  }
  followedSessions() {
    return new Set([...this.#t, ...this.#n.filter(hasLiveProcess).map((entry) => entry.pgid)]);
  }
  noteCommandLeftProcesses(pgid, toolUseId) {
    if (!this.isFollowing() || !TOOL_USE_ID_RE.test(toolUseId)) return Promise.resolve();
    let generation = this.#e;
    this.#t.add(pgid);
    return findProcessesByPgid(new Set([pgid]))
      .then((processesByPgid) => {
        let processes = processesByPgid.get(pgid);
        if (processes?.some(([pid]) => pid === pgid)) return;
        if (processes !== undefined && this.#e === generation)
          this.#s({
            tool_use_id: toolUseId,
            pgid,
            processes,
          });
      })
      .catch(() => {})
      .finally(() => this.#t.delete(pgid));
  }
  #s(entry) {
    this.#n = [
      ...this.#n.filter((existing) => existing.tool_use_id !== entry.tool_use_id && hasLiveProcess(existing)),
      entry,
    ].slice(-MAX_TRACKED_TOOL_ENTRIES);
  }
  reset() {
    this.#n = [];
    this.#e = undefined;
    this.#t.clear();
  }
}
//@ chunk-2dvnfacg.js:2394-2542 placement
function hasLiveProcess({ processes }) {
  return processes.some(([pid, expectedField]) => {
    try {
      let file = readFileSync(`/proc/${pid}/stat`, "utf8");
      return getProcessState(file, expectedField) !== "gone";
    } catch (error) {
      return classifyProcessError(error) !== "gone";
    }
  });
}
//@ chunk-2dvnfacg.js:2542-2576 placement
/**
 * 按宿主缓存的遗留后台进程跟踪器，重置时清空记录。
 */
var leftoverProcessTracker; // deferred: uses LeftoverProcessTracker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2dvnfacg.js:2542", () => {
  leftoverProcessTracker = identity(new LeftoverProcessTracker(), (tracker) => tracker.reset());
});
//@ chunk-2dvnfacg.js:2752-2849 placement
var CC_SHELL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var cpuacctState;
deferInit("chunk-2dvnfacg.js:2752", () => {
  CC_SHELL = "cc-shell";
  cpuacctState = identity(
    {
      dir: undefined,
      joinCommand: undefined,
    },
    (state) => {
      state.dir = undefined;
      state.joinCommand = undefined;
    },
  );
});
//@ chunk-2dvnfacg.js:2849-2982 placement
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
//@ chunk-2dvnfacg.js:2982-3018 placement
/**
 * 取把子进程加入 cpuacct 组的 shell 片段。
 */
function getCpuacctJoinCommand() {
  return cpuacctState.joinCommand;
}
//@ chunk-2dvnfacg.js:3018-3046 placement
/**
 * 取当前 cpuacct 计量目录。
 */
function getCpuacctDir() {
  return cpuacctState.dir;
}
//@ chunk-2dvnfacg.js:3046-3079 placement
/**
 * Linux cpuacct 控制组的挂载根路径。
 */
var CPUACCT_ROOT = "/sys/fs/cgroup/cpuacct";
//@ chunk-2dvnfacg.js:3079-3203 placement
/**
 * 从 /proc/<pid>/cgroup 内容中取 cpuacct 控制组路径。
 */
function getCpuacctPath(mountInfo) {
  for (let line of mountInfo.split(`
`)) {
    let [, controller, ...pathParts] = line.split(":");
    if (controller === "cpuacct" && pathParts.length > 0) return pathParts.join(":");
  }
  return;
}
//@ chunk-2dvnfacg.js:3203-3538 placement
/**
 * 在 cpuacct cgroup 下为 Bash 工具创建子组（路径须至少两段、不含 ..、非 cc- 结尾），已存在视为成功，失败记录后返回 undefined。
 */
function ensureCpuacctGroup(groupPath, mkdir = mkdirSync) {
  let filtered = groupPath.split("/").filter(Boolean);
  if (filtered.length < 2 || filtered.at(-1)?.startsWith("cc-") || filtered.includes("..")) return;
  let joined = posix.join(CPUACCT_ROOT, groupPath, CC_SHELL);
  try {
    mkdir(joined);
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
//@ chunk-2dvnfacg.js:3538-3667 placement
/**
 * 读取 cpuacct.usage（纳秒）并转换为毫秒。
 */
function readCpuUsageSeconds(usagePath) {
  try {
    let trimmed = readFileSync(usagePath, "utf8").trim();
    let microseconds = trimmed === "" ? Number.NaN : Number(trimmed);
    return Number.isFinite(microseconds) ? microseconds / 1e6 : undefined;
  } catch {
    return;
  }
}
export {
  getCpuacctDir,
  getCpuacctPath,
  CPUACCT_ROOT,
  ensureCpuacctGroup,
  setCpuacctDir,
  readCpuUsageSeconds,
  leftoverProcessTracker,
  isProcessGroupAlive,
  findProcessesByPgid,
  getCpuacctJoinCommand,
};
