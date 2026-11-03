/**
 * utils/machineStatus.ts
 *
 * 2.1.316 新增：机器状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 7, affinity 3
 */
import { totalmem } from "os";
import { readFile } from "fs/promises";
import { posix } from "path";
import { identity as identity_2 } from "./identity.js";
import { getPlatform } from "./platform.js";
import { parseMemoryCgroup } from "./toolCgroup.js";
import { collectDirectoryNames } from "../hooks/fileSuggestions.js";
import { logForDebugging } from "./debug.js";
import { getErrnoCode } from "./errors.js";

//@ chunk-e6aww6q8.js:3294343-3294437 placement
/**
 * 机器状态缓存时长、初始空状态与刷新中标记。
 */
var MACHINE_STATUS_TTL_MS = 2000;
var EMPTY_MACHINE_STATUS = {
  memory: undefined,
  load: undefined,
  disk: undefined,
};
var machineStatusRefreshingState = identity_2(
  {
    value: false,
  },
  (e) => {
    e.value = false;
  },
);
//@ chunk-e6aww6q8.js:3294437-3294514 placement
function machineStatusDeps() {
  return {
    platform: getPlatform(),
    totalmem,
    readText: (e) => readFile(e, "utf8"),
  };
}
//@ chunk-e6aww6q8.js:3294514-3294812 placement
async function getMachineMemoryStatus(e = machineStatusDeps()) {
  if (e.platform !== "linux" && e.platform !== "wsl") return;
  let { available, container, hostOomKills } = await readMemoryStats(e);
  let h = container === undefined ? available : availableQuota(container, available);
  return h === undefined
    ? undefined
    : {
        availableBytes: h,
        totalBytes: container?.limit ?? e.totalmem(),
        limitedByCgroup: container !== undefined,
        oomKills: container === undefined ? hostOomKills : container.oomKills,
      };
}
//@ chunk-e6aww6q8.js:3294812-3294835 placement
/**
 * 机器状态钩子空实现。
 */
function noopMachineStatusHook(cwd) {
  return;
}
//@ chunk-e6aww6q8.js:3294835-3294904 placement
function availableQuota(container, available) {
  return Math.min(Math.max(0, container.limit - container.used), available ?? 1 / 0);
}
//@ chunk-e6aww6q8.js:3294904-3295140 affinity
async function readMemoryStats(host) {
  let [procFile, procFile_2, cgroupMemory] = await Promise.all([
    readProcFile(host, "/proc/meminfo"),
    readProcFile(host, "/proc/vmstat"),
    readCgroupMemory(host),
  ]);
  let h = matchNumber(/^MemAvailable:\s+(\d+) kB$/m, procFile);
  return {
    available: h === undefined ? undefined : h * 1024,
    hostOomKills: matchNumber(/^oom_kill (\d+)$/m, procFile_2),
    container: cgroupMemory,
  };
}
//@ chunk-e6aww6q8.js:3295140-3295980 affinity
/**
 * 读取 cgroup（v1/v2）内存限制：沿层级找最紧的 limit，再读用量、inactive_file 与 OOM 次数。
 */
async function readCgroupMemory(host) {
  let cgroupText = await readProcFile(host, "/proc/self/cgroup");
  let cgroup = cgroupText === undefined ? undefined : parseMemoryCgroup(cgroupText);
  if (cgroup === undefined) return;
  let files = cgroup.v2
    ? {
        limit: "memory.max",
        usage: "memory.current",
        inactiveFile: /^inactive_file (\d+)$/m,
        oomKills: "memory.events",
      }
    : {
        limit: "memory.limit_in_bytes",
        usage: "memory.usage_in_bytes",
        inactiveFile: /^total_inactive_file (\d+)$/m,
        oomKills: "memory.oom_control",
      };
  let h = host.totalmem();
  let tightest;
  for (let dir of collectDirectoryNames(cgroup.mountRoot, cgroup.path)) {
    let limit = matchNumber(/^(\d+)$/m, await readTextQuiet(host, posix.join(dir, files.limit)));
    if (limit !== undefined && limit > 0 && limit < h && (tightest === undefined || limit < tightest.limit))
      tightest = {
        dir,
        limit,
      };
  }
  if (tightest === undefined) return;
  let [usageText, statText, eventsText] = await Promise.all([
    readProcFile(host, posix.join(tightest.dir, files.usage)),
    readProcFile(host, posix.join(tightest.dir, "memory.stat")),
    readProcFile(host, posix.join(tightest.dir, files.oomKills)),
  ]);
  let usage = matchNumber(/^(\d+)$/m, usageText);
  if (usage === undefined) return;
  let inactiveFile = matchNumber(files.inactiveFile, statText) ?? 0;
  return {
    limit: tightest.limit,
    used: Math.max(0, usage - inactiveFile),
    oomKills: matchNumber(/^oom_kill (\d+)$/m, eventsText),
  };
}
//@ chunk-e6aww6q8.js:3296114-3296216 affinity
function matchNumber(e, n) {
  if (n === undefined) return;
  let r = Number(e.exec(n)?.[1]);
  return Number.isFinite(r) ? r : undefined;
}
//@ chunk-e6aww6q8.js:3296216-3296372 placement
async function readProcFile(host, n) {
  try {
    return await host.readText(n);
  } catch (error) {
    logForDebugging(
      `machine status: ${n} not read (${getErrnoCode(error) ?? "unreadable"}); its figures are left out`,
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3296372-3296441 placement
async function readTextQuiet(host, n) {
  try {
    return await host.readText(n);
  } catch {
    return;
  }
}
export { noopMachineStatusHook, EMPTY_MACHINE_STATUS, MACHINE_STATUS_TTL_MS, getMachineMemoryStatus };
