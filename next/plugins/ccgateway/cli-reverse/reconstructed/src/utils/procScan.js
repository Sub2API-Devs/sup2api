/**
 * utils/procScan.ts
 *
 * 读 /proc 统计进程与监听端口，供 mcp serve 的 CPU 报告使用（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y080jnb6.js (15)
 * attribution: placement 15
 */
import { readdir, readFile, open, readlink } from "fs/promises";
import { parseStatTimes, isMinorFaultField, statState } from "./procStat.js";
import { getErrnoCode } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { identity } from "./identity.js";

//@ chunk-y080jnb6.js:906-939 placement
var MAX_SESSIONS = 10;
var MAX_PORTS = 10;
var PASS_BUDGET_MS = 50;
var READ_BATCH = 64;
var MAX_FILE_BYTES = 262144;
//@ chunk-y080jnb6.js:939-1073 placement
function parseProcessStat(pid, file) {
  let statTimes = parseStatTimes(file);
  return statTimes === undefined
    ? undefined
    : {
        pid,
        ppid: statTimes.ppid,
        session: statTimes.session,
        starttime: statTimes.starttime,
        hasExited: isMinorFaultField(statState(file)),
      };
}
//@ chunk-y080jnb6.js:1073-1324 placement
function otherSessionIds(rows, ownRow, known) {
  let mine = new Set([0, ownRow.session, ...known]);
  for (let row of rows)
    if (
      row.starttime <= ownRow.starttime ||
      (!row.hasExited && row.ppid === ownRow.pid && row.pid === row.session)
    )
      mine.add(row.session);
  let others = new Set();
  for (let row of rows) if (!row.hasExited && !mine.has(row.session)) others.add(row.session);
  return others;
}
//@ chunk-y080jnb6.js:1324-1335 placement
var TCP_LISTEN_STATE = "0A";
//@ chunk-y080jnb6.js:1335-1577 placement
function parseSocketTable(table) {
  let rows = [];
  for (let line of table.split(`
`)) {
    let [, localAddress, , state, , , , , , inode] = line.trim().split(/\s+/);
    if (state !== TCP_LISTEN_STATE || localAddress === undefined || inode === undefined) continue;
    let port = Number.parseInt(localAddress.slice(localAddress.lastIndexOf(":") + 1), 16);
    if (!Number.isNaN(port))
      rows.push({
        port,
        inode,
      });
  }
  return rows;
}
//@ chunk-y080jnb6.js:1577-1681 placement
function newPorts(listening, ports, ownInodes) {
  return new Set(
    listening.filter(({ port, inode }) => !ports.has(port) && !ownInodes.has(inode)).map(({ port }) => port),
  );
}
//@ chunk-y080jnb6.js:1681-1704 placement
class CpuCountError extends Error {}
//@ chunk-y080jnb6.js:1704-1762 placement
function isGone(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ESRCH";
}
//@ chunk-y080jnb6.js:1762-2212 placement
/**
 * 遍历 /proc 读各进程 stat，超时或解析失败时给出提示。
 */
async function readProcessRows(deadline = 1 / 0, procRoot = "/proc") {
  let filtered = (await readdir(procRoot)).filter((name) => /^[0-9]+$/.test(name));
  let rows = [];
  for (let offset = 0; offset < filtered.length; offset += READ_BATCH) {
    if (performance.now() > deadline) throw new CpuCountError("the pass over /proc ran out of time");
    let results = await Promise.all(
      filtered.slice(offset, offset + READ_BATCH).map(async (pid) => {
        let stat;
        try {
          stat = await readFile(`${procRoot}/${pid}/stat`, "utf8");
        } catch (error) {
          if (isGone(error)) return [];
          throw error;
        }
        let row = parseProcessStat(Number(pid), stat);
        if (row === undefined) throw new CpuCountError("a stat line could not be parsed");
        return [row];
      }),
    );
    rows.push(...results.flat());
  }
  return rows;
}
//@ chunk-y080jnb6.js:2212-2485 placement
/**
 * 读一张 socket 表（latin1），超大时放弃计数。
 */
async function readCappedFile(path) {
  let handle = await open(path, "r");
  try {
    let buffer = Buffer.allocUnsafe(MAX_FILE_BYTES + 1);
    let total = 0;
    for (;;) {
      let { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (bytesRead === 0) return buffer.toString("latin1", 0, total);
      total += bytesRead;
      if (total > MAX_FILE_BYTES) throw new CpuCountError("a socket table is too long to count from");
    }
  } finally {
    await handle.close();
  }
}
//@ chunk-y080jnb6.js:2485-2634 placement
/**
 * 读 /proc/net/tcp 与 tcp6 两张表。
 */
async function readListeningSockets(procRoot = "/proc") {
  let tcp4 = parseSocketTable(await readCappedFile(`${procRoot}/net/tcp`));
  let tcp6;
  try {
    tcp6 = await readCappedFile(`${procRoot}/net/tcp6`);
  } catch (error) {
    if (isGone(error)) return tcp4;
    throw error;
  }
  return [...tcp4, ...parseSocketTable(tcp6)];
}
//@ chunk-y080jnb6.js:2634-2906 placement
/**
 * 读 /proc/self/fd 找本进程自己的 socket inode。
 */
async function readOwnSocketInodes(procRoot = "/proc") {
  let results = await Promise.all(
    (await readdir(`${procRoot}/self/fd`)).map(async (fd) => {
      try {
        return await readlink(`${procRoot}/self/fd/${fd}`);
      } catch (error) {
        if (isGone(error)) return "";
        throw error;
      }
    }),
  );
  let inodes = new Set();
  for (let target of results) {
    let inode = /^socket:\[([0-9]+)\]$/.exec(target)?.[1];
    if (inode !== undefined) inodes.add(inode);
  }
  return inodes;
}
//@ chunk-y080jnb6.js:2906-3066 placement
var PROC_SOURCES = {
  readOwnStat: () => readFile("/proc/self/stat", "utf8"),
  readProcessRows: (deadline) => readProcessRows(deadline),
  readListeningSockets: () => readListeningSockets(),
  readOwnSocketInodes: () => readOwnSocketInodes(),
};
var UNEXPECTED_ERROR = "an unexpected error";
//@ chunk-y080jnb6.js:3066-4772 placement
/**
 * CPU 报告用的进程计数：读自身 stat 与监听端口，按会话排除自身树、只计新增端口，任何一步失败就整体略过并记日志。
 */
class CpuReportSource {
  #o;
  #t = new Map();
  #e;
  constructor(sources = PROC_SOURCES) {
    this.#e = sources;
  }
  enableCounting() {
    this.reset();
    this.#o = Promise.all([
      this.#n("other_process_sessions", async () => {
        let ownStat = await this.#e.readOwnStat();
        if (Number.parseInt(ownStat, 10) !== process.pid)
          throw new CpuCountError("/proc/self/stat names another pid");
        let ownRow = parseProcessStat(process.pid, ownStat);
        if (ownRow === undefined) throw new CpuCountError("a stat line could not be parsed");
        return ownRow;
      }),
      this.#n(
        "listening_ports",
        async () => new Set((await this.#e.readListeningSockets()).map(({ port }) => port)),
      ),
    ]).then(
      ([ownRow, ports]) => ({
        self: ownRow,
        ports,
      }),
      () => ({
        self: undefined,
        ports: undefined,
      }),
    );
  }
  async look() {
    let baseline = await this.#o;
    if (baseline === undefined) return;
    let { self: ownRow, ports } = baseline;
    let [rows, newPortCount] = await Promise.all([
      ownRow === undefined
        ? undefined
        : this.#n("other_process_sessions", async () => {
            if (ownRow.pid === 1)
              throw new CpuCountError("process 1 cannot tell its own children from orphans");
            let rows = await this.#e.readProcessRows(performance.now() + PASS_BUDGET_MS);
            if (!rows.some(({ pid }) => pid === ownRow.pid))
              throw new CpuCountError("/proc does not list this process");
            return rows;
          }),
      ports === undefined
        ? undefined
        : this.#n("listening_ports", async () => {
            let listening = await this.#e.readListeningSockets();
            let ownInodes = await this.#e.readOwnSocketInodes();
            return newPorts(listening, ports, ownInodes).size;
          }),
    ]);
    return {
      ...(ownRow !== undefined &&
        rows !== undefined && {
          self: ownRow,
          rows,
        }),
      ...(newPortCount !== undefined && {
        newPorts: newPortCount,
      }),
    };
  }
  count(sample, knownSessions) {
    return {
      ...(sample?.self !== undefined &&
        sample.rows !== undefined && {
          other_process_sessions: Math.min(
            otherSessionIds(sample.rows, sample.self, knownSessions).size,
            MAX_SESSIONS,
          ),
        }),
      ...(sample?.newPorts !== undefined && {
        listening_ports: Math.min(sample.newPorts, MAX_PORTS),
      }),
    };
  }
  reset() {
    this.#o = undefined;
    this.#t.clear();
  }
  async #n(section, read) {
    let failure;
    try {
      return await read();
    } catch (error) {
      failure = error instanceof CpuCountError ? error.message : (getErrnoCode(error) ?? UNEXPECTED_ERROR);
      if (failure === UNEXPECTED_ERROR && this.#t.get(section) !== failure) logError(error);
      return;
    } finally {
      if (this.#t.get(section) !== failure) {
        this.#t.set(section, failure);
        logForDebugging(
          failure === undefined
            ? `mcp serve: ${section} is on the CPU report again`
            : `mcp serve: ${section} is left off the CPU report: ${failure}`,
          {
            level: failure === undefined ? "info" : "warn",
          },
        );
      }
    }
  }
}
//@ chunk-y080jnb6.js:4772-4803 placement
var leftoverCounter = identity(new CpuReportSource(), (agentId) => agentId.reset());
export { leftoverCounter };
