/**
 * utils/procStat.ts
 *
 * 2.1.316 新增：/proc stat 读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v4n8v118.js (10)
 * attribution: placement 10
 */

//@ chunk-v4n8v118.js:191-258 placement
/**
 * procStatField：取 /proc/<pid>/stat 的某个字段。
 */
function procStatField(e) {
  return e.slice(e.lastIndexOf(")") + 2).split(" ")[19];
}
//@ chunk-v4n8v118.js:258-395 placement
/**
 * 从 /proc/<pid>/stat 内容取父进程 id。
 */
function statPpid(file) {
  let n = file.slice(file.lastIndexOf(")") + 2).split(" ")[1];
  let r = n === undefined ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? undefined : r;
}
//@ chunk-v4n8v118.js:395-532 placement
/**
 * 从 /proc/<pid>/stat 内容取进程组 id。
 */
function statPgrp(file) {
  let n = file.slice(file.lastIndexOf(")") + 2).split(" ")[2];
  let r = n === undefined ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? undefined : r;
}
//@ chunk-v4n8v118.js:532-669 placement
/**
 * 从 /proc/<pid>/stat 内容取会话 id。
 */
function statSession(e) {
  let n = e.slice(e.lastIndexOf(")") + 2).split(" ")[3];
  let r = n === undefined ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? undefined : r;
}
//@ chunk-v4n8v118.js:669-915 placement
/**
 * 从 /proc stat 取 ppid、pgrp、session 与本进程加子进程的 CPU 时钟数。
 */
function parseStatCpu(stat) {
  let [, n, r, i, , , , , , , , t, u, d, o] = stat
    .slice(stat.lastIndexOf(")") + 2)
    .split(" ", 15)
    .map(Number);
  let s = (t ?? NaN) + (u ?? NaN) + (d ?? NaN) + (o ?? NaN);
  return n === undefined || r === undefined || i === undefined || Number.isNaN(n + r + i + s)
    ? undefined
    : {
        ppid: n,
        pgrp: r,
        session: i,
        cpuTicks: s,
      };
}
//@ chunk-v4n8v118.js:915-1220 placement
/**
 * 从 /proc stat 取 ppid、pgrp、session、启动时间，以及本进程与已回收子进程各自的 CPU 时钟数。
 */
function parseStatTimes(e) {
  let mapped = e
    .slice(e.lastIndexOf(")") + 2)
    .split(" ", 20)
    .map(Number);
  let [, r, i, t, , , , , , , , u, d, o, s] = mapped;
  let c = mapped[19];
  let m = (u ?? NaN) + (d ?? NaN);
  let a = (o ?? NaN) + (s ?? NaN);
  return r === undefined ||
    i === undefined ||
    t === undefined ||
    c === undefined ||
    Number.isNaN(r + i + t + c + m + a)
    ? undefined
    : {
        ppid: r,
        pgrp: i,
        session: t,
        starttime: c,
        ownTicks: m,
        childrenTicks: a,
      };
}
//@ chunk-v4n8v118.js:1220-1361 placement
/**
 * 从 /proc stat 取进程状态字段。
 */
function statState(e) {
  let index = e.lastIndexOf(")");
  if (index < 0) return;
  let sliced = e.slice(index + 2);
  let index_2 = sliced.indexOf(" ");
  let t = index_2 < 0 ? sliced : sliced.slice(0, index_2);
  return t.length === 0 ? undefined : t;
}
//@ chunk-v4n8v118.js:1361-1400 placement
/**
 * isMinorFaultField：次缺页相关字段（Z/X）。
 */
function isMinorFaultField(e) {
  return e === "Z" || e === "X";
}
//@ chunk-v4n8v118.js:1400-1727 placement
/**
 * 从 /proc stat 取缺页次数（次/主、子进程次缺页）与子进程 CPU 时钟数。
 */
function parseStatFaults(file) {
  let parts = file.slice(file.lastIndexOf(")") + 2).split(" ");
  let r = {
    minorFaults: Number.parseInt(parts[7] ?? "", 10),
    majorFaults: Number.parseInt(parts[9] ?? "", 10),
    childrenMinorFaults: Number.parseInt(parts[8] ?? "", 10),
    childrenCpuTicks: Number.parseInt(parts[13] ?? "", 10) + Number.parseInt(parts[14] ?? "", 10),
  };
  return Object.values(r).some(Number.isNaN) ? undefined : r;
}
//@ chunk-v4n8v118.js:1727-1841 placement
/**
 * 从 /proc/<pid>/io 取 read_bytes。
 */
function parseReadBytes(file) {
  let n = Number.parseInt(/^read_bytes: (\d+)$/m.exec(file)?.[1] ?? "", 10);
  return Number.isNaN(n) ? undefined : n;
}
export {
  procStatField,
  isMinorFaultField,
  statState,
  statPgrp,
  statPpid,
  statSession,
  parseStatCpu,
  parseStatFaults,
  parseReadBytes,
  parseStatTimes,
};
