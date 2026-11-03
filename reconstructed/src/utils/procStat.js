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
function kI(e) {
  return e.slice(e.lastIndexOf(")") + 2).split(" ")[19];
}
/**
 * 从 /proc/<pid>/stat 内容取父进程 id。
 */
//@ chunk-v4n8v118.js:258-395 placement
function statPpid(e) {
  let n = e.slice(e.lastIndexOf(")") + 2).split(" ")[1],
    r = n === void 0 ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? void 0 : r;
}
/**
 * 从 /proc/<pid>/stat 内容取进程组 id。
 */
//@ chunk-v4n8v118.js:395-532 placement
function statPgrp(e) {
  let n = e.slice(e.lastIndexOf(")") + 2).split(" ")[2],
    r = n === void 0 ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? void 0 : r;
}
/**
 * 从 /proc/<pid>/stat 内容取会话 id。
 */
//@ chunk-v4n8v118.js:532-669 placement
function statSession(e) {
  let n = e.slice(e.lastIndexOf(")") + 2).split(" ")[3],
    r = n === void 0 ? NaN : Number.parseInt(n, 10);
  return Number.isNaN(r) ? void 0 : r;
}
/**
 * 从 /proc stat 取 ppid、pgrp、session 与本进程加子进程的 CPU 时钟数。
 */
//@ chunk-v4n8v118.js:669-915 placement
function parseStatCpu(e) {
  let [, n, r, i, , , , , , , , t, u, d, o] = e
      .slice(e.lastIndexOf(")") + 2)
      .split(" ", 15)
      .map(Number),
    s = (t ?? NaN) + (u ?? NaN) + (d ?? NaN) + (o ?? NaN);
  return n === void 0 || r === void 0 || i === void 0 || Number.isNaN(n + r + i + s)
    ? void 0
    : { ppid: n, pgrp: r, session: i, cpuTicks: s };
}
/**
 * 从 /proc stat 取 ppid、pgrp、session、启动时间，以及本进程与已回收子进程各自的 CPU 时钟数。
 */
//@ chunk-v4n8v118.js:915-1220 placement
function parseStatTimes(e) {
  let mapped = e
      .slice(e.lastIndexOf(")") + 2)
      .split(" ", 20)
      .map(Number),
    [, r, i, t, , , , , , , , u, d, o, s] = mapped,
    c = mapped[19],
    m = (u ?? NaN) + (d ?? NaN),
    a = (o ?? NaN) + (s ?? NaN);
  return r === void 0 || i === void 0 || t === void 0 || c === void 0 || Number.isNaN(r + i + t + c + m + a)
    ? void 0
    : { ppid: r, pgrp: i, session: t, starttime: c, ownTicks: m, childrenTicks: a };
}
/**
 * 从 /proc stat 取进程状态字段。
 */
//@ chunk-v4n8v118.js:1220-1361 placement
function statState(e) {
  let index = e.lastIndexOf(")");
  if (index < 0) return;
  let sliced = e.slice(index + 2),
    index_2 = sliced.indexOf(" "),
    t = index_2 < 0 ? sliced : sliced.slice(0, index_2);
  return t.length === 0 ? void 0 : t;
}
//@ chunk-v4n8v118.js:1361-1400 placement
function RY(e) {
  return e === "Z" || e === "X";
}
/**
 * 从 /proc stat 取缺页次数（次/主、子进程次缺页）与子进程 CPU 时钟数。
 */
//@ chunk-v4n8v118.js:1400-1727 placement
function parseStatFaults(e) {
  let parts = e.slice(e.lastIndexOf(")") + 2).split(" "),
    r = {
      minorFaults: Number.parseInt(parts[7] ?? "", 10),
      majorFaults: Number.parseInt(parts[9] ?? "", 10),
      childrenMinorFaults: Number.parseInt(parts[8] ?? "", 10),
      childrenCpuTicks: Number.parseInt(parts[13] ?? "", 10) + Number.parseInt(parts[14] ?? "", 10),
    };
  return Object.values(r).some(Number.isNaN) ? void 0 : r;
}
/**
 * 从 /proc/<pid>/io 取 read_bytes。
 */
//@ chunk-v4n8v118.js:1727-1841 placement
function parseReadBytes(e) {
  let int = Number.parseInt(/^read_bytes: (\d+)$/m.exec(e)?.[1] ?? "", 10);
  return Number.isNaN(int) ? void 0 : int;
}

export {
  kI,
  RY,
  statState,
  statPgrp,
  statPpid,
  statSession,
  parseStatCpu,
  parseStatFaults,
  parseReadBytes,
  parseStatTimes,
};
