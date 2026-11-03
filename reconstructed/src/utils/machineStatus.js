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
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
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
import { ge } from "./identity.js";
import { getPlatform } from "./platform.js";
import { parseMemoryCgroup } from "./toolCgroup.js";
import { collectDirectoryNames } from "../hooks/fileSuggestions.js";
import { logForDebugging } from "./debug.js";
import { getErrnoCode } from "./errors.js";

//@ chunk-e6aww6q8.js:3294343-3294437 placement
var QZe = 2000,
  Wjo = { memory: void 0, load: void 0, disk: void 0 },
  TDd = ge({ value: !1 }, (e) => {
    e.value = !1;
  });
//@ chunk-e6aww6q8.js:3294437-3294514 placement
function ZAr() {
  return { platform: getPlatform(), totalmem: totalmem, readText: (e) => readFile_14(e, "utf8") };
}
//@ chunk-e6aww6q8.js:3294514-3294812 placement
async function getMachineMemoryStatus(e = ZAr()) {
  if (e.platform !== "linux" && e.platform !== "wsl") return;
  let { available: available, container: container, hostOomKills: hostOomKills } = await readMemoryStats(e),
    h = container === void 0 ? available : exr(container, available);
  return h === void 0
    ? void 0
    : {
        availableBytes: h,
        totalBytes: container?.limit ?? e.totalmem(),
        limitedByCgroup: container !== void 0,
        oomKills: container === void 0 ? hostOomKills : container.oomKills,
      };
}
//@ chunk-e6aww6q8.js:3294812-3294835 placement
function Gmn(e) {
  return;
}
//@ chunk-e6aww6q8.js:3294835-3294904 placement
function exr(e, n) {
  return Math.min(Math.max(0, e.limit - e.used), n ?? 1 / 0);
}
//@ chunk-e6aww6q8.js:3294904-3295140 affinity
async function readMemoryStats(e) {
  let [n, r, s] = await Promise.all([
      readProcFile(e, "/proc/meminfo"),
      readProcFile(e, "/proc/vmstat"),
      readCgroupMemory(e),
    ]),
    h = matchNumber(/^MemAvailable:\s+(\d+) kB$/m, n);
  return {
    available: h === void 0 ? void 0 : h * 1024,
    hostOomKills: matchNumber(/^oom_kill (\d+)$/m, r),
    container: s,
  };
}
/**
 * 读取 cgroup（v1/v2）内存限制：沿层级找最紧的 limit，再读用量、inactive_file 与 OOM 次数。
 */
//@ chunk-e6aww6q8.js:3295140-3295980 affinity
async function readCgroupMemory(host) {
  let cgroupText = await readProcFile(host, "/proc/self/cgroup"),
    cgroup = cgroupText === void 0 ? void 0 : parseMemoryCgroup(cgroupText);
  if (cgroup === void 0) return;
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
        },
    totalmem = host.totalmem(),
    tightest;
  for (let dir of collectDirectoryNames(cgroup.mountRoot, cgroup.path)) {
    let limit = matchNumber(/^(\d+)$/m, await rxr(host, posix_9.join(dir, files.limit)));
    if (limit !== void 0 && limit > 0 && limit < totalmem && (tightest === void 0 || limit < tightest.limit))
      tightest = { dir: dir, limit: limit };
  }
  if (tightest === void 0) return;
  let [usageText, statText, eventsText] = await Promise.all([
      readProcFile(host, posix_9.join(tightest.dir, files.usage)),
      readProcFile(host, posix_9.join(tightest.dir, "memory.stat")),
      readProcFile(host, posix_9.join(tightest.dir, files.oomKills)),
    ]),
    usage = matchNumber(/^(\d+)$/m, usageText);
  if (usage === void 0) return;
  let inactiveFile = matchNumber(files.inactiveFile, statText) ?? 0;
  return {
    limit: tightest.limit,
    used: Math.max(0, usage - inactiveFile),
    oomKills: matchNumber(/^oom_kill (\d+)$/m, eventsText),
  };
}
//@ chunk-e6aww6q8.js:3296114-3296216 affinity
function matchNumber(e, n) {
  if (n === void 0) return;
  let r = Number(e.exec(n)?.[1]);
  return Number.isFinite(r) ? r : void 0;
}
//@ chunk-e6aww6q8.js:3296216-3296372 placement
async function readProcFile(e, n) {
  try {
    return await e.readText(n);
  } catch (error) {
    logForDebugging(
      `machine status: ${n} not read (${getErrnoCode(error) ?? "unreadable"}); its figures are left out`,
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3296372-3296441 placement
async function rxr(e, n) {
  try {
    return await e.readText(n);
  } catch {
    return;
  }
}

export { Gmn, Wjo, QZe, getMachineMemoryStatus };
