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
function procStatField(file) {
  return file.slice(file.lastIndexOf(")") + 2).split(" ")[19];
}
//@ chunk-v4n8v118.js:258-395 placement
/**
 * 从 /proc/<pid>/stat 内容取父进程 id。
 */
function statPpid(statText) {
  let ppidField = statText.slice(statText.lastIndexOf(")") + 2).split(" ")[1];
  let ppid = ppidField === undefined ? NaN : Number.parseInt(ppidField, 10);
  return Number.isNaN(ppid) ? undefined : ppid;
}
//@ chunk-v4n8v118.js:395-532 placement
/**
 * 从 /proc/<pid>/stat 内容取进程组 id。
 */
function statPgrp(statText) {
  let pgrpField = statText.slice(statText.lastIndexOf(")") + 2).split(" ")[2];
  let pgrp = pgrpField === undefined ? NaN : Number.parseInt(pgrpField, 10);
  return Number.isNaN(pgrp) ? undefined : pgrp;
}
//@ chunk-v4n8v118.js:532-669 placement
/**
 * 从 /proc/<pid>/stat 内容取会话 id。
 */
function statSession(file) {
  let sessionField = file.slice(file.lastIndexOf(")") + 2).split(" ")[3];
  let session = sessionField === undefined ? NaN : Number.parseInt(sessionField, 10);
  return Number.isNaN(session) ? undefined : session;
}
//@ chunk-v4n8v118.js:669-915 placement
/**
 * 从 /proc stat 取 ppid、pgrp、session 与本进程加子进程的 CPU 时钟数。
 */
function parseStatCpu(stat) {
  let [, ppid, pgrp, session, , , , , , , , utime, stime, cutime, cstime] = stat
    .slice(stat.lastIndexOf(")") + 2)
    .split(" ", 15)
    .map(Number);
  let cpuTicks = (utime ?? NaN) + (stime ?? NaN) + (cutime ?? NaN) + (cstime ?? NaN);
  return ppid === undefined ||
    pgrp === undefined ||
    session === undefined ||
    Number.isNaN(ppid + pgrp + session + cpuTicks)
    ? undefined
    : {
        ppid,
        pgrp,
        session,
        cpuTicks,
      };
}
//@ chunk-v4n8v118.js:915-1220 placement
/**
 * 从 /proc stat 取 ppid、pgrp、session、启动时间，以及本进程与已回收子进程各自的 CPU 时钟数。
 */
function parseStatTimes(file) {
  let mapped = file
    .slice(file.lastIndexOf(")") + 2)
    .split(" ", 20)
    .map(Number);
  let [, ppid, pgrp, session, , , , , , , , utime, stime, cutime, cstime] = mapped;
  let starttime = mapped[19];
  let ownTicks = (utime ?? NaN) + (stime ?? NaN);
  let childrenTicks = (cutime ?? NaN) + (cstime ?? NaN);
  return ppid === undefined ||
    pgrp === undefined ||
    session === undefined ||
    starttime === undefined ||
    Number.isNaN(ppid + pgrp + session + starttime + ownTicks + childrenTicks)
    ? undefined
    : {
        ppid,
        pgrp,
        session,
        starttime,
        ownTicks,
        childrenTicks,
      };
}
//@ chunk-v4n8v118.js:1220-1361 placement
/**
 * 从 /proc stat 取进程状态字段。
 */
function statState(file) {
  let index = file.lastIndexOf(")");
  if (index < 0) return;
  let sliced = file.slice(index + 2);
  let index_2 = sliced.indexOf(" ");
  let state = index_2 < 0 ? sliced : sliced.slice(0, index_2);
  return state.length === 0 ? undefined : state;
}
//@ chunk-v4n8v118.js:1361-1400 placement
/**
 * isMinorFaultField：次缺页相关字段（Z/X）。
 */
function isMinorFaultField(state) {
  return state === "Z" || state === "X";
}
//@ chunk-v4n8v118.js:1400-1727 placement
/**
 * 从 /proc stat 取缺页次数（次/主、子进程次缺页）与子进程 CPU 时钟数。
 */
function parseStatFaults(file) {
  let parts = file.slice(file.lastIndexOf(")") + 2).split(" ");
  let faults = {
    minorFaults: Number.parseInt(parts[7] ?? "", 10),
    majorFaults: Number.parseInt(parts[9] ?? "", 10),
    childrenMinorFaults: Number.parseInt(parts[8] ?? "", 10),
    childrenCpuTicks: Number.parseInt(parts[13] ?? "", 10) + Number.parseInt(parts[14] ?? "", 10),
  };
  return Object.values(faults).some(Number.isNaN) ? undefined : faults;
}
//@ chunk-v4n8v118.js:1727-1841 placement
/**
 * 从 /proc/<pid>/io 取 read_bytes。
 */
function parseReadBytes(file) {
  let readBytes = Number.parseInt(/^read_bytes: (\d+)$/m.exec(file)?.[1] ?? "", 10);
  return Number.isNaN(readBytes) ? undefined : readBytes;
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
