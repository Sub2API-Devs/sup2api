/**
 * utils/machineStatus.ts
 *
 * 2.1.316 新增：机器状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3379400-3379494 placement
/**
 * 机器状态缓存时长、初始空状态与刷新中标记。
 */
var MACHINE_STATUS_TTL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_MACHINE_STATUS;
var machineStatusRefreshingState;
deferInit("chunk-5xgkngpb.js:3379400", () => {
  MACHINE_STATUS_TTL_MS = 2000;
  EMPTY_MACHINE_STATUS = {
    memory: undefined,
    load: undefined,
    disk: undefined,
  };
  machineStatusRefreshingState = identity_2(
    {
      value: false,
    },
    (state) => {
      state.value = false;
    },
  );
});
//@ chunk-5xgkngpb.js:3379494-3379571 placement
function machineStatusDeps() {
  return {
    platform: getPlatform(),
    totalmem,
    readText: (path) => readFile(path, "utf8"),
  };
}
//@ chunk-5xgkngpb.js:3379571-3379869 placement
async function getMachineMemoryStatus(deps = machineStatusDeps()) {
  if (deps.platform !== "linux" && deps.platform !== "wsl") return;
  let { available, container, hostOomKills } = await readMemoryStats(deps);
  let availableBytes = container === undefined ? available : availableQuota(container, available);
  return availableBytes === undefined
    ? undefined
    : {
        availableBytes,
        totalBytes: container?.limit ?? deps.totalmem(),
        limitedByCgroup: container !== undefined,
        oomKills: container === undefined ? hostOomKills : container.oomKills,
      };
}
//@ chunk-5xgkngpb.js:3379869-3379892 placement
/**
 * 机器状态钩子空实现。
 */
function noopMachineStatusHook(cwd) {
  return;
}
//@ chunk-5xgkngpb.js:3379892-3379961 placement
function availableQuota(container, available) {
  return Math.min(Math.max(0, container.limit - container.used), available ?? 1 / 0);
}
//@ chunk-5xgkngpb.js:3379961-3380197 affinity
async function readMemoryStats(host) {
  let [procFile, procFile_2, cgroupMemory] = await Promise.all([
    readProcFile(host, "/proc/meminfo"),
    readProcFile(host, "/proc/vmstat"),
    readCgroupMemory(host),
  ]);
  let availableKb = matchNumber(/^MemAvailable:\s+(\d+) kB$/m, procFile);
  return {
    available: availableKb === undefined ? undefined : availableKb * 1024,
    hostOomKills: matchNumber(/^oom_kill (\d+)$/m, procFile_2),
    container: cgroupMemory,
  };
}
//@ chunk-5xgkngpb.js:3380197-3381040 affinity
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
  let totalBytes = host.totalmem();
  let tightest;
  for (let dir of collectDirectoryNames(cgroup.mountRoot, cgroup.path)) {
    let limit = matchNumber(/^(\d+)$/m, await readTextQuiet(host, posix.join(dir, files.limit)));
    if (
      limit !== undefined &&
      limit > 0 &&
      limit < totalBytes &&
      (tightest === undefined || limit < tightest.limit)
    )
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
//@ chunk-5xgkngpb.js:3381174-3381276 affinity
function matchNumber(pattern, text) {
  if (text === undefined) return;
  let value = Number(pattern.exec(text)?.[1]);
  return Number.isFinite(value) ? value : undefined;
}
//@ chunk-5xgkngpb.js:3381276-3381432 placement
async function readProcFile(host, path) {
  try {
    return await host.readText(path);
  } catch (error) {
    logForDebugging(
      `machine status: ${path} not read (${getErrnoCode(error) ?? "unreadable"}); its figures are left out`,
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:3381432-3381501 placement
async function readTextQuiet(host, path) {
  try {
    return await host.readText(path);
  } catch {
    return;
  }
}
export { noopMachineStatusHook, MACHINE_STATUS_TTL_MS, getMachineMemoryStatus, EMPTY_MACHINE_STATUS };
