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
import { kI, RY, statState, statPgrp, statPpid } from "../utils/procStat.js";
import { provenSameProcessAsync } from "../utils/processIdentity.js";
import { withDeadline } from "../utils/sleep.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";

//@ chunk-3nztfxrw.js:36305-36323 placement
var ve = 4096,
  Ve = 64;
/**
 * 读进程表（Linux 读 /proc，其他平台用 ps）并计算以 pid 为根的进程树。
 */
//@ chunk-3nztfxrw.js:36323-36589 placement
function snapshotProcessTree(e, n) {
  if (!Number.isInteger(e.pid) || e.pid <= 1) return Promise.resolve(void 0);
  let r = getPlatform();
  if (r === "linux" || r === "wsl") {
    let m = readProcFs();
    return Promise.resolve(m && walkProcessTree(e, m));
  }
  if (r === "windows") return Promise.resolve(void 0);
  return readPsTable(n).then(
    (m) => m && walkProcessTree(e, m),
    () => {
      return;
    },
  );
}
//@ chunk-3nztfxrw.js:36589-36601 placement
var fe = 3000;
//@ chunk-3nztfxrw.js:36601-37190 placement
async function readProcessTable(e, n) {
  let r = [...e.pinned],
    m = new Map(),
    a,
    t = !1,
    i = getPlatform(),
    s;
  if (i === "macos")
    s = readPsForPids([process.pid, ...r.map(([l]) => l)], n).then((l) => {
      let b = proveProcesses(l, process.pid, e.pinned);
      if (b === void 0) {
        t = !0;
        return;
      }
      a = b.ownPgrp;
      for (let [w, S] of b.proven) m.set(w, S);
    });
  else if (i === "linux" || i === "wsl")
    ((a = Bn()),
      (s = Je(r, async ([l, b]) => {
        let w = await readFile(`/proc/${l}/stat`, "utf8").catch(() => {
          return;
        });
        if (w !== void 0 && kI(w) === b && !RY(statState(w))) m.set(l, statPgrp(w));
      })));
  else
    s = Je(r, async ([l, b]) => {
      if ((await provenSameProcessAsync(l, b)) === !0) m.set(l, void 0);
    });
  let c = await withDeadline(
    s.then(() => !0),
    n,
  ).catch(() => {
    return;
  });
  return { proven: m, ownPgrp: a, incomplete: t || c !== !0 };
}
/**
 * 用启动时间令牌核对进程仍是原来那个，返回已证实的 pid 与本进程组。
 */
//@ chunk-3nztfxrw.js:37190-37367 placement
function proveProcesses(e, n, r) {
  let m = e.get(n);
  if (m === void 0) return;
  let a = new Map();
  for (let [t, i] of r) {
    let s = e.get(t);
    if (s !== void 0 && s.token === i) a.set(t, s.pgrp);
  }
  return { proven: a, ownPgrp: m.pgrp };
}
/**
 * 统计树中仍存活且已证实的进程数。
 */
//@ chunk-3nztfxrw.js:37367-37468 placement
async function countLiveProcesses(e, n = fe) {
  let { proven: proven, incomplete: incomplete } = await readProcessTable(e, n);
  return { live: proven.size, incomplete: incomplete };
}
/**
 * 向已证实的进程组与进程发送信号（跳过本进程与根进程）。
 */
//@ chunk-3nztfxrw.js:37468-37836 placement
async function killProcessTree(e, n, r = fe) {
  let { proven: proven, ownPgrp: ownPgrp, incomplete: incomplete } = await readProcessTable(e, r),
    i = 0;
  if (ownPgrp !== void 0) {
    let c = new Set();
    for (let l of proven.values())
      if (l !== void 0 && l > 1 && l !== e.rootPid && l !== ownPgrp && l !== process.pid) c.add(l);
    for (let l of c)
      try {
        (process.kill(-l, n), i++);
      } catch {}
  }
  let s = 0;
  for (let c of proven.keys())
    try {
      (process.kill(c, n), s++);
    } catch {}
  return { proven: proven.size, pids: s, groups: i, incomplete: incomplete };
}
/**
 * 从进程表按父子关系遍历进程树，记录带令牌的 pid（超上限截断，根进程被复用时停止）。
 */
//@ chunk-3nztfxrw.js:37836-38468 placement
function walkProcessTree(e, n) {
  let r = new Map(),
    m = [],
    a;
  for (let row of n.rows) {
    let b = r.get(row.ppid);
    if (b) b.push(row);
    else r.set(row.ppid, [row]);
    if (row.pid === e.pid) a = row;
    else if (row.pgrp === e.pid) m.push(row);
  }
  let t = e.alive ? a !== void 0 && e.token !== void 0 && a.token !== e.token : a !== void 0,
    i = {
      rootPid: e.pid,
      pinned: new Map(),
      unpinned: 0,
      truncated: !1,
      degraded: n.degraded,
      rootRecycled: t,
    };
  if (t) return i;
  let s = e.alive ? [...m, ...(r.get(e.pid) ?? [])] : m,
    c = new Set([e.pid]);
  while (s.length > 0) {
    let l = s.shift();
    if (l.pid <= 1 || c.has(l.pid)) continue;
    if (c.size > ve) {
      i.truncated = !0;
      break;
    }
    if ((c.add(l.pid), l.token === void 0)) i.unpinned++;
    else i.pinned.set(l.pid, l.token);
    s.push(...(r.get(l.pid) ?? []));
  }
  return i;
}
/**
 * 读取 /proc 下各进程的 ppid、pgrp 与启动时间令牌。
 */
//@ chunk-3nztfxrw.js:38468-38784 placement
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
      let m = readFileSync(`/proc/${r}/stat`, "utf8"),
        a = statPpid(m);
      if (a === void 0 || RY(statState(m))) continue;
      let t = kI(m);
      n.push({
        pid: Number(r),
        ppid: a,
        pgrp: statPgrp(m),
        token: t !== void 0 && t.length > 0 ? t : void 0,
      });
    } catch {}
  }
  return { rows: n, degraded: !1 };
}
//@ chunk-3nztfxrw.js:38784-38857 placement
function Bn() {
  try {
    return statPgrp(readFileSync("/proc/self/stat", "utf8"));
  } catch {
    return;
  }
}
//@ chunk-3nztfxrw.js:38857-38942 placement
function Qe() {
  return { USER_TYPE: "external", NODE_ENV: "production", LC_ALL: "C", TZ: "UTC" };
}
/**
 * 用 ps -A 读取进程表。
 */
//@ chunk-3nztfxrw.js:38942-39178 placement
async function readPsTable(e) {
  let n = await execFileNoThrowWithCwd(
      "ps",
      ["-A", "-o", "pid=", "-o", "ppid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart="],
      { timeout: e, env: Qe(), cwd: "/", stripFinalNewline: !1 },
    ),
    r = parsePsTable(n.stdout);
  return r.length === 0 ? void 0 : { rows: r, degraded: n.code !== 0 };
}
/**
 * 解析 ps 输出（跳过僵尸进程）。
 */
//@ chunk-3nztfxrw.js:39178-39456 placement
function parsePsTable(e) {
  let n = [],
    sliced = e.slice(
      0,
      e.lastIndexOf(`
`) + 1,
    );
  for (let m of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(m),
      t = match?.[4];
    if (match && t !== void 0 && !t.startsWith("Z"))
      n.push({ pid: Number(match[1]), ppid: Number(match[2]), pgrp: Number(match[3]), token: match[5] });
  }
  return n;
}
/**
 * 用 ps -p 读取指定进程的 pgid 与启动时间。
 */
//@ chunk-3nztfxrw.js:39456-39642 placement
async function readPsForPids(e, n) {
  let r = await execFileNoThrowWithCwd(
    "ps",
    ["-o", "pid=", "-o", "pgid=", "-o", "stat=", "-o", "lstart=", "-p", e.join(",")],
    { timeout: n, env: Qe(), cwd: "/", stripFinalNewline: !1 },
  );
  return parsePsPids(r.stdout);
}
/**
 * 解析 ps -p 输出为 pid → {pgrp, token}。
 */
//@ chunk-3nztfxrw.js:39642-39912 placement
function parsePsPids(e) {
  let n = new Map(),
    sliced = e.slice(
      0,
      e.lastIndexOf(`
`) + 1,
    );
  for (let m of sliced.split(`
`)) {
    let match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S.*?)\s*$/.exec(m),
      t = match?.[3],
      i = match?.[4];
    if (match && t !== void 0 && i !== void 0 && !t.startsWith("Z"))
      n.set(Number(match[1]), { pgrp: Number(match[2]), token: i });
  }
  return n;
}
//@ chunk-3nztfxrw.js:39912-40006 placement
async function Je(e, n) {
  for (let r = 0; r < e.length; r += Ve) await Promise.all(e.slice(r, r + Ve).map(n));
}

export { fe, snapshotProcessTree, ve, killProcessTree, countLiveProcesses };
