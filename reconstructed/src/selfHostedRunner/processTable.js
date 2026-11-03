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
function snapshotProcessTree(e, timeout) {
  if (!Number.isInteger(e.pid) || e.pid <= 1) return Promise.resolve(undefined);
  let platform = getPlatform();
  if (platform === "linux" || platform === "wsl") {
    let procFs = readProcFs();
    return Promise.resolve(procFs && walkProcessTree(e, procFs));
  }
  if (platform === "windows") return Promise.resolve(undefined);
  return readPsTable(timeout).then(
    (psTable) => psTable && walkProcessTree(e, psTable),
    () => {
      return;
    },
  );
}
//@ chunk-3nztfxrw.js:36589-36601 placement
var PROCESS_COMMAND_TIMEOUT_MS = 3000;
//@ chunk-3nztfxrw.js:36601-37190 placement
async function readProcessTable(e, timeout) {
  let r = [...e.pinned];
  let m = new Map();
  let a;
  let t = false;
  let platform = getPlatform();
  let s;
  if (platform === "macos")
    s = readPsForPids([process.pid, ...r.map(([l]) => l)], timeout).then((psForPids) => {
      let b = proveProcesses(psForPids, process.pid, e.pinned);
      if (b === undefined) {
        t = true;
        return;
      }
      a = b.ownPgrp;
      for (let [w, S] of b.proven) m.set(w, S);
    });
  else if (platform === "linux" || platform === "wsl") {
    a = ownProcessGroup();
    s = runInBatches(r, async ([l, b]) => {
      let w = await readFile(`/proc/${l}/stat`, "utf8").catch(() => {
        return;
      });
      if (w !== undefined && procStatField(w) === b && !isMinorFaultField(statState(w)))
        m.set(l, statPgrp(w));
    });
  } else
    s = runInBatches(r, async ([l, b]) => {
      if ((await provenSameProcessAsync(l, b)) === true) m.set(l, undefined);
    });
  let c = await withDeadline(
    s.then(() => true),
    timeout,
  ).catch(() => {
    return;
  });
  return {
    proven: m,
    ownPgrp: a,
    incomplete: t || c !== true,
  };
}
//@ chunk-3nztfxrw.js:37190-37367 placement
/**
 * 用启动时间令牌核对进程仍是原来那个，返回已证实的 pid 与本进程组。
 */
function proveProcesses(psForPids, pid, pinned) {
  let m = psForPids.get(pid);
  if (m === undefined) return;
  let a = new Map();
  for (let [t, i] of pinned) {
    let s = psForPids.get(t);
    if (s !== undefined && s.token === i) a.set(t, s.pgrp);
  }
  return {
    proven: a,
    ownPgrp: m.pgrp,
  };
}
//@ chunk-3nztfxrw.js:37367-37468 placement
/**
 * 统计树中仍存活且已证实的进程数。
 */
async function countLiveProcesses(e, n = PROCESS_COMMAND_TIMEOUT_MS) {
  let { proven, incomplete } = await readProcessTable(e, n);
  return {
    live: proven.size,
    incomplete,
  };
}
//@ chunk-3nztfxrw.js:37468-37836 placement
/**
 * 向已证实的进程组与进程发送信号（跳过本进程与根进程）。
 */
async function killProcessTree(e, n, r = PROCESS_COMMAND_TIMEOUT_MS) {
  let { proven, ownPgrp, incomplete } = await readProcessTable(e, r);
  let i = 0;
  if (ownPgrp !== undefined) {
    let c = new Set();
    for (let l of proven.values())
      if (l !== undefined && l > 1 && l !== e.rootPid && l !== ownPgrp && l !== process.pid) c.add(l);
    for (let l of c)
      try {
        process.kill(-l, n);
        i++;
      } catch {}
  }
  let s = 0;
  for (let key of proven.keys())
    try {
      process.kill(key, n);
      s++;
    } catch {}
  return {
    proven: proven.size,
    pids: s,
    groups: i,
    incomplete,
  };
}
//@ chunk-3nztfxrw.js:37836-38468 placement
/**
 * 从进程表按父子关系遍历进程树，记录带令牌的 pid（超上限截断，根进程被复用时停止）。
 */
function walkProcessTree(e, n) {
  let r = new Map();
  let m = [];
  let a;
  for (let l of n.rows) {
    let b = r.get(l.ppid);
    if (b) b.push(l);
    else r.set(l.ppid, [l]);
    if (l.pid === e.pid) a = l;
    else if (l.pgrp === e.pid) m.push(l);
  }
  let t = e.alive ? a !== undefined && e.token !== undefined && a.token !== e.token : a !== undefined;
  let i = {
    rootPid: e.pid,
    pinned: new Map(),
    unpinned: 0,
    truncated: false,
    degraded: n.degraded,
    rootRecycled: t,
  };
  if (t) return i;
  let s = e.alive ? [...m, ...(r.get(e.pid) ?? [])] : m;
  let c = new Set([e.pid]);
  while (s.length > 0) {
    let l = s.shift();
    if (l.pid <= 1 || c.has(l.pid)) continue;
    if (c.size > MAX_PROCESS_TABLE_ENTRIES) {
      i.truncated = true;
      break;
    }
    c.add(l.pid);
    if (l.token === undefined) i.unpinned++;
    else i.pinned.set(l.pid, l.token);
    s.push(...(r.get(l.pid) ?? []));
  }
  return i;
}
//@ chunk-3nztfxrw.js:38468-38784 placement
/**
 * 读取 /proc 下各进程的 ppid、pgrp 与启动时间令牌。
 */
function readProcFs() {
  let e;
  try {
    e = readdirSync("/proc");
  } catch {
    return;
  }
  let n = [];
  for (let r of e) {
    if (!/^\d+$/.test(r)) continue;
    try {
      let file = readFileSync(`/proc/${r}/stat`, "utf8");
      let a = statPpid(file);
      if (a === undefined || isMinorFaultField(statState(file))) continue;
      let t = procStatField(file);
      n.push({
        pid: Number(r),
        ppid: a,
        pgrp: statPgrp(file),
        token: t !== undefined && t.length > 0 ? t : undefined,
      });
    } catch {}
  }
  return {
    rows: n,
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
  let n = await execFileNoThrowWithCwd(
    "ps",
    ["-A", "-o", "pid=", "-o", "ppid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart="],
    {
      timeout,
      env: MINIMAL_PS_ENV(),
      cwd: "/",
      stripFinalNewline: false,
    },
  );
  let psTable = parsePsTable(n.stdout);
  return psTable.length === 0
    ? undefined
    : {
        rows: psTable,
        degraded: n.code !== 0,
      };
}
//@ chunk-3nztfxrw.js:39178-39456 placement
/**
 * 解析 ps 输出（跳过僵尸进程）。
 */
function parsePsTable(stdout) {
  let n = [];
  let sliced = stdout.slice(
    0,
    stdout.lastIndexOf(`
`) + 1,
  );
  for (let line of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(line);
    let t = match?.[4];
    if (match && t !== undefined && !t.startsWith("Z"))
      n.push({
        pid: Number(match[1]),
        ppid: Number(match[2]),
        pgrp: Number(match[3]),
        token: match[5],
      });
  }
  return n;
}
//@ chunk-3nztfxrw.js:39456-39642 placement
/**
 * 用 ps -p 读取指定进程的 pgid 与启动时间。
 */
async function readPsForPids(e, timeout) {
  let r = await execFileNoThrowWithCwd(
    "ps",
    ["-o", "pid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart=", "-p", e.join(",")],
    {
      timeout,
      env: MINIMAL_PS_ENV(),
      cwd: "/",
      stripFinalNewline: false,
    },
  );
  return parsePsPids(r.stdout);
}
//@ chunk-3nztfxrw.js:39642-39912 placement
/**
 * 解析 ps -p 输出为 pid → {pgrp, token}。
 */
function parsePsPids(stdout) {
  let n = new Map();
  let sliced = stdout.slice(
    0,
    stdout.lastIndexOf(`
`) + 1,
  );
  for (let line of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(line);
    let t = match?.[3];
    let i = match?.[4];
    if (match && t !== undefined && i !== undefined && !t.startsWith("Z"))
      n.set(Number(match[1]), {
        pgrp: Number(match[2]),
        token: i,
      });
  }
  return n;
}
//@ chunk-3nztfxrw.js:39912-40006 placement
async function runInBatches(e, n) {
  for (let r = 0; r < e.length; r += PROCESS_BATCH_SIZE)
    await Promise.all(e.slice(r, r + PROCESS_BATCH_SIZE).map(n));
}
export {
  PROCESS_COMMAND_TIMEOUT_MS,
  snapshotProcessTree,
  MAX_PROCESS_TABLE_ENTRIES,
  killProcessTree,
  countLiveProcesses,
};
