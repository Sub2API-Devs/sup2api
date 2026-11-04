/**
 * selfHostedRunner/processTable.ts
 *
 * 读取进程表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (16)
 * attribution: placement 16
 */
import { readFile } from "fs/promises";
import { readdirSync, readFileSync } from "fs";
import { getPlatform } from "../utils/platform.js";
import { procStatField, isMinorFaultField, statState, statPgrp, statPpid } from "../utils/procStat.js";
import { provenSameProcessAsync } from "../utils/processIdentity.js";
import { withDeadline } from "../utils/sleep.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";

//@ chunk-3nztfxrw.js:36305-36323 placement
/**
 * 进程表限额：最多 4096 个进程、每次并发 64 个、ps/命令超时 3 s。
 */
var MAX_PROCESS_TABLE_ENTRIES = 4096;
var PROCESS_BATCH_SIZE = 64;
//@ chunk-3nztfxrw.js:36323-36589 placement
/**
 * 读进程表（Linux 读 /proc，其他平台用 ps）并计算以 pid 为根的进程树。
 */
function snapshotProcessTree(rootProcess, timeout) {
  if (!Number.isInteger(rootProcess.pid) || rootProcess.pid <= 1) return Promise.resolve(undefined);
  let platform = getPlatform();
  if (platform === "linux" || platform === "wsl") {
    let table = readProcFs();
    return Promise.resolve(table && walkProcessTree(rootProcess, table));
  }
  if (platform === "windows") return Promise.resolve(undefined);
  return readPsTable(timeout).then(
    (table) => table && walkProcessTree(rootProcess, table),
    () => {
      return;
    },
  );
}
//@ chunk-3nztfxrw.js:36589-36601 placement
var PROCESS_COMMAND_TIMEOUT_MS = 3000;
//@ chunk-3nztfxrw.js:36601-37190 placement
async function readProcessTable(target, timeout) {
  let pinned = [...target.pinned];
  let proven = new Map();
  let ownPgrp;
  let incomplete = false;
  let platform = getPlatform();
  let lookup;
  if (platform === "macos")
    lookup = readPsForPids([process.pid, ...pinned.map(([pid]) => pid)], timeout).then((psForPids) => {
      let proof = proveProcesses(psForPids, process.pid, target.pinned);
      if (proof === undefined) {
        incomplete = true;
        return;
      }
      ownPgrp = proof.ownPgrp;
      for (let [pid, pgrp] of proof.proven) proven.set(pid, pgrp);
    });
  else if (platform === "linux" || platform === "wsl") {
    ownPgrp = ownProcessGroup();
    lookup = runInBatches(pinned, async ([pid, startToken]) => {
      let statText = await readFile(`/proc/${pid}/stat`, "utf8").catch(() => {
        return;
      });
      if (
        statText !== undefined &&
        procStatField(statText) === startToken &&
        !isMinorFaultField(statState(statText))
      )
        proven.set(pid, statPgrp(statText));
    });
  } else
    lookup = runInBatches(pinned, async ([pid, startToken]) => {
      if ((await provenSameProcessAsync(pid, startToken)) === true) proven.set(pid, undefined);
    });
  let finished = await withDeadline(
    lookup.then(() => true),
    timeout,
  ).catch(() => {
    return;
  });
  return {
    proven,
    ownPgrp,
    incomplete: incomplete || finished !== true,
  };
}
//@ chunk-3nztfxrw.js:37190-37367 placement
/**
 * 用启动时间令牌核对进程仍是原来那个，返回已证实的 pid 与本进程组。
 */
function proveProcesses(psForPids, pid, pinned) {
  let own = psForPids.get(pid);
  if (own === undefined) return;
  let proven = new Map();
  for (let [pid, token] of pinned) {
    let row = psForPids.get(pid);
    if (row !== undefined && row.token === token) proven.set(pid, row.pgrp);
  }
  return {
    proven,
    ownPgrp: own.pgrp,
  };
}
//@ chunk-3nztfxrw.js:37367-37468 placement
/**
 * 统计树中仍存活且已证实的进程数。
 */
async function countLiveProcesses(target, timeout = PROCESS_COMMAND_TIMEOUT_MS) {
  let { proven, incomplete } = await readProcessTable(target, timeout);
  return {
    live: proven.size,
    incomplete,
  };
}
//@ chunk-3nztfxrw.js:37468-37836 placement
/**
 * 向已证实的进程组与进程发送信号（跳过本进程与根进程）。
 */
async function killProcessTree(target, signal, timeout = PROCESS_COMMAND_TIMEOUT_MS) {
  let { proven, ownPgrp, incomplete } = await readProcessTable(target, timeout);
  let killed = 0;
  if (ownPgrp !== undefined) {
    let pgrps = new Set();
    for (let pgrp of proven.values())
      if (
        pgrp !== undefined &&
        pgrp > 1 &&
        pgrp !== target.rootPid &&
        pgrp !== ownPgrp &&
        pgrp !== process.pid
      )
        pgrps.add(pgrp);
    for (let pgrp of pgrps)
      try {
        process.kill(-pgrp, signal);
        killed++;
      } catch {}
  }
  let killed_2 = 0;
  for (let key of proven.keys())
    try {
      process.kill(key, signal);
      killed_2++;
    } catch {}
  return {
    proven: proven.size,
    pids: killed_2,
    groups: killed,
    incomplete,
  };
}
//@ chunk-3nztfxrw.js:37836-38468 placement
/**
 * 从进程表按父子关系遍历进程树，记录带令牌的 pid（超上限截断，根进程被复用时停止）。
 */
function walkProcessTree(root, table) {
  let byParent = new Map();
  let rows = [];
  let rootRow;
  for (let row of table.rows) {
    let siblings = byParent.get(row.ppid);
    if (siblings) siblings.push(row);
    else byParent.set(row.ppid, [row]);
    if (row.pid === root.pid) rootRow = row;
    else if (row.pgrp === root.pid) rows.push(row);
  }
  let rootRecycled = root.alive
    ? rootRow !== undefined && root.token !== undefined && rootRow.token !== root.token
    : rootRow !== undefined;
  let tree = {
    rootPid: root.pid,
    pinned: new Map(),
    unpinned: 0,
    truncated: false,
    degraded: table.degraded,
    rootRecycled,
  };
  if (rootRecycled) return tree;
  let queue = root.alive ? [...rows, ...(byParent.get(root.pid) ?? [])] : rows;
  let seen = new Set([root.pid]);
  while (queue.length > 0) {
    let row = queue.shift();
    if (row.pid <= 1 || seen.has(row.pid)) continue;
    if (seen.size > MAX_PROCESS_TABLE_ENTRIES) {
      tree.truncated = true;
      break;
    }
    seen.add(row.pid);
    if (row.token === undefined) tree.unpinned++;
    else tree.pinned.set(row.pid, row.token);
    queue.push(...(byParent.get(row.pid) ?? []));
  }
  return tree;
}
//@ chunk-3nztfxrw.js:38468-38784 placement
/**
 * 读取 /proc 下各进程的 ppid、pgrp 与启动时间令牌。
 */
function readProcFs() {
  let names;
  try {
    names = readdirSync("/proc");
  } catch {
    return;
  }
  let rows = [];
  for (let name of names) {
    if (!/^\d+$/.test(name)) continue;
    try {
      let statText = readFileSync(`/proc/${name}/stat`, "utf8");
      let ppid = statPpid(statText);
      if (ppid === undefined || isMinorFaultField(statState(statText))) continue;
      let startToken = procStatField(statText);
      rows.push({
        pid: Number(name),
        ppid,
        pgrp: statPgrp(statText),
        token: startToken !== undefined && startToken.length > 0 ? startToken : undefined,
      });
    } catch {}
  }
  return {
    rows,
    degraded: false,
  };
}
//@ chunk-3nztfxrw.js:38784-38857 placement
function ownProcessGroup() {
  try {
    return statPgrp(readFileSync("/proc/self/stat", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-3nztfxrw.js:38857-38942 placement
function MINIMAL_PS_ENV() {
  return {
    USER_TYPE: "external",
    NODE_ENV: "production",
    LC_ALL: "C",
    TZ: "UTC",
  };
}
//@ chunk-3nztfxrw.js:38942-39178 placement
/**
 * 用 ps -A 读取进程表。
 */
async function readPsTable(timeout) {
  let psResult = await execFileNoThrowWithCwd(
    "ps",
    ["-A", "-o", "pid=", "-o", "ppid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart="],
    {
      timeout,
      env: MINIMAL_PS_ENV(),
      cwd: "/",
      stripFinalNewline: false,
    },
  );
  let psTable = parsePsTable(psResult.stdout);
  return psTable.length === 0
    ? undefined
    : {
        rows: psTable,
        degraded: psResult.code !== 0,
      };
}
//@ chunk-3nztfxrw.js:39178-39456 placement
/**
 * 解析 ps 输出（跳过僵尸进程）。
 */
function parsePsTable(stdout) {
  let rows = [];
  let sliced = stdout.slice(
    0,
    stdout.lastIndexOf(`
`) + 1,
  );
  for (let line of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(line);
    let startToken = match?.[4];
    if (match && startToken !== undefined && !startToken.startsWith("Z"))
      rows.push({
        pid: Number(match[1]),
        ppid: Number(match[2]),
        pgrp: Number(match[3]),
        token: match[5],
      });
  }
  return rows;
}
//@ chunk-3nztfxrw.js:39456-39642 placement
/**
 * 用 ps -p 读取指定进程的 pgid 与启动时间。
 */
async function readPsForPids(pids, timeout) {
  let psResult = await execFileNoThrowWithCwd(
    "ps",
    ["-o", "pid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart=", "-p", pids.join(",")],
    {
      timeout,
      env: MINIMAL_PS_ENV(),
      cwd: "/",
      stripFinalNewline: false,
    },
  );
  return parsePsPids(psResult.stdout);
}
//@ chunk-3nztfxrw.js:39642-39912 placement
/**
 * 解析 ps -p 输出为 pid → {pgrp, token}。
 */
function parsePsPids(stdout) {
  let map = new Map();
  let sliced = stdout.slice(
    0,
    stdout.lastIndexOf(`
`) + 1,
  );
  for (let line of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(line);
    let startToken = match?.[3];
    let stateField = match?.[4];
    if (match && startToken !== undefined && stateField !== undefined && !startToken.startsWith("Z"))
      map.set(Number(match[1]), {
        pgrp: Number(match[2]),
        token: stateField,
      });
  }
  return map;
}
//@ chunk-3nztfxrw.js:39912-40006 placement
async function runInBatches(items, run) {
  for (let index = 0; index < items.length; index += PROCESS_BATCH_SIZE)
    await Promise.all(items.slice(index, index + PROCESS_BATCH_SIZE).map(run));
}
export {
  PROCESS_COMMAND_TIMEOUT_MS,
  snapshotProcessTree,
  MAX_PROCESS_TABLE_ENTRIES,
  killProcessTree,
  countLiveProcesses,
};
