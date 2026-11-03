/**
 * selfHostedRunner/stdioWriter.ts
 *
 * runner 标准输出写入器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (2)
 * attribution: placement 2
 */
import { isatty } from "tty";
import { fstatSync, openSync, constants, writeSync } from "fs";
import { openNonBlockingStdoutFd } from "../ink/nonBlockingStdout.js";
import { getPlatform } from "../utils/platform.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { getErrnoCode } from "../utils/errors.js";
import { systemClock } from "../utils/sleep.js";
import {
  MAX_RECENT_REQUESTS,
  MAX_REQUEST_BODY_BYTES,
  countNewlines,
  HEALTH_PORT_LOW,
  HEALTH_PORT_HIGH,
} from "./healthServer.js";
import { STREAM_GONE_CODES } from "../utils/process.js";

//@ chunk-3nztfxrw.js:27630-30995 placement
/**
 * runner 标准输出写入器的底层操作：openOwn 重新打开 fd（终端或 Linux 管道）为非阻塞，sameFile 比较是否同一文件，writeOnAThread 在 Worker 线程用 SharedArrayBuffer 同步写（按整行、不超过 PIPE_BUF），sleep 用 Atomics.wait。
 */
var [SLOT_IDLE, SLOT_WRITING, SLOT_DONE] = [0, 1, 2];
var THREAD_WRITE_CHUNK_BYTES = 65536;
var THREAD_START_TIMEOUT_MS = 5000;
var WRITE_ERRNOS = ["EPIPE", "ECONNRESET", "ENXIO", "EBADF", "EIO", "ENOSPC", "EINVAL"];
var WRITER_THREAD_SOURCE = `
const { writeSync } = require('fs')
let fd, shared, errnos
onmessage = ({ data }) => {
  if (shared === undefined) {
    ;({ fd, shared, errnos } = data)
    Atomics.store(shared, 3, 1)
    return
  }
  let written = 0
  let errno = 0
  while (written < data.length) {
    // Whole lines of at most PIPE_BUF bytes in one write(2), so that another writer to the same
    // pipe cannot land inside one of them, as with one line per write before; a longer line alone.
    let end = Math.min(written + 4096, data.length)
    if (end < data.length) {
      const lastNewline = data.lastIndexOf(10, end - 1)
      end = lastNewline >= written ? lastNewline + 1 : data.indexOf(10, written) + 1 || data.length
    }
    try {
      written += writeSync(fd, data, written, end - written)
    } catch (e) {
      // The description may be non-blocking: in the runner, code that reads process.stderr at
      // import (the debug package) makes stderr so, and process.stdout where no terminal is
      // named in the environment; another holder may too. Then try again in 5 ms.
      if (e.code === 'EAGAIN') {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5)
      } else if (e.code !== 'EINTR') {
        errno = errnos.indexOf(e.code) + 1 || errnos.length + 1
        break
      }
    }
  }
  Atomics.store(shared, 1, written)
  Atomics.store(shared, 2, errno)
  Atomics.store(shared, 0, ${SLOT_DONE})
  Atomics.notify(shared, 0)
  postMessage(0)
}
`;
var stdioWriterOps = {
  openOwn(e) {
    try {
      if (isatty(e)) {
        let nonBlockingStdoutFd = openNonBlockingStdoutFd(e);
        return (
          nonBlockingStdoutFd.fd ?? {
            refused: `the terminal could not be opened a second time: ${nonBlockingStdoutFd.errno ?? nonBlockingStdoutFd.reason}`,
            writtenHere: getPlatform() === "windows",
          }
        );
      }
      let n = fstatSync(e);
      if (!n.isFIFO())
        return {
          refused: n.isSocket()
            ? "a socket cannot be opened a second time"
            : "only a terminal, or a pipe on Linux, can be opened a second time",
          writtenHere: n.isFile() || n.isCharacterDevice() || getPlatform() === "windows",
        };
      return openSync(`/proc/self/fd/${e}`, constants.O_WRONLY | constants.O_NONBLOCK | READ_LIMITS);
    } catch (error) {
      return {
        refused: `it could not be opened a second time: ${getErrnoCode(error) ?? "unknown"}`,
        writtenHere: getPlatform() === "windows",
      };
    }
  },
  sameFile(e, n) {
    try {
      let [r, m] = [fstatSync(e), fstatSync(n)];
      return r.dev === m.dev && r.ino === m.ino && r.rdev === m.rdev;
    } catch {
      return false;
    }
  },
  writeSync: (e, n, r) => writeSync(e, n, r),
  writeOnAThread(fd, onmessage) {
    let int32Array = new Int32Array(new SharedArrayBuffer(16));
    let m;
    let a;
    let t;
    try {
      let c = URL.createObjectURL(
        new Blob([WRITER_THREAD_SOURCE], {
          type: "application/javascript",
        }),
      );
      m = new Worker(c);
      m.unref?.();
      m.onmessage = onmessage;
      m.onerror = () => {
        m = undefined;
      };
      m.postMessage({
        fd,
        shared: int32Array,
        errnos: WRITE_ERRNOS,
      });
    } catch {
      m = undefined;
    }
    let i = (code) => {
      throw Object.assign(Error("the thread did not write the bytes"), {
        code,
      });
    };
    return {
      write: (c, l) => {
        if (t !== undefined) {
          let code = t;
          t = undefined;
          i(code);
        }
        let b = Atomics.load(int32Array, 0);
        if (b === SLOT_DONE) {
          let [w, S] = [Atomics.load(int32Array, 1), Atomics.load(int32Array, 2)];
          Atomics.store(int32Array, 0, SLOT_IDLE);
          if (S > 0) {
            let code = WRITE_ERRNOS[S - 1] ?? "unknown";
            if (w === 0) i(code);
            t = code;
          }
          return w;
        }
        if (
          b === SLOT_WRITING &&
          Atomics.load(int32Array, 3) === 0 &&
          a !== undefined &&
          performance.now() - a > THREAD_START_TIMEOUT_MS
        ) {
          m?.terminate();
          m = undefined;
          Atomics.store(int32Array, 0, SLOT_IDLE);
        }
        if (m === undefined)
          throw Object.assign(Error("the thread could not be started"), {
            code: "NO_THREAD",
          });
        if (b === SLOT_IDLE) {
          Atomics.store(int32Array, 0, SLOT_WRITING);
          a = performance.now();
          m.postMessage(Uint8Array.prototype.slice.call(c, l, l + THREAD_WRITE_CHUNK_BYTES));
        }
        throw Object.assign(Error("the thread has the bytes"), {
          code: "EINPROGRESS",
        });
      },
      wait(c) {
        Atomics.wait(int32Array, 0, SLOT_WRITING, c);
      },
    };
  },
  sleep(e) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, e);
  },
};
//@ chunk-3nztfxrw.js:30995-36063 placement
/**
 * 打开 runner 的标准输出写入器（非阻塞描述符、独立线程、EPIPE 处理）
 */
function openStdioWriter(e) {
  let io = e.io ?? stdioWriterOps;
  let clock = e.clock ?? systemClock;
  let m = (h, name) => {
    let v = io.openOwn(h);
    let L = typeof v === "number" ? v : h;
    let M = typeof v === "number" || v.writtenHere ? undefined : io.writeOnAThread(h, () => q(H));
    let H = {
      name,
      fd: L,
      via:
        typeof v === "number"
          ? "a non-blocking descriptor"
          : v.writtenHere
            ? "the descriptor this process was given"
            : "the descriptor this process was given, on a thread of its own",
      because: typeof v === "number" ? undefined : v.refused,
      write: M?.write ?? ((Q, oe) => io.writeSync(L, Q, oe)),
      waitForTheThread: M?.wait,
      waiting: [],
      waitingBytes: 0,
      gone: false,
      unannounced: 0,
      retryMs: MAX_RECENT_REQUESTS,
    };
    return H;
  };
  let a = io.sameFile(1, 2);
  let t = m(1, a ? "stdout and stderr" : "stdout");
  let i = a ? t : m(2, "stderr");
  let s = a ? [t] : [t, i];
  let c = {};
  let l = new Set();
  let droppedLines = 0;
  let w = false;
  let S = false;
  function T(h, lines) {
    h.unannouncedSinceMs ??= clock.monotonicNow();
    h.unannounced += lines;
    droppedLines += lines;
  }
  function N(h) {
    if (h.unannounced > 0) {
      let unannounced = h.unannounced;
      h.unannounced = 0;
      let max = Math.max(1, Math.ceil((clock.monotonicNow() - (h.unannouncedSinceMs ?? 0)) / 1000));
      let L = e.stamp(
        `[runner:log] ${unannounced === 1 ? "1 log line" : `${unannounced} log lines`} to ${h.name} ${unannounced === 1 ? "was" : "were"} dropped over ${max} s: whatever reads ${h.name} was paused or too slow`,
      );
      let M = {
        bytes: Buffer.from(
          L +
            `
`,
        ),
        offset: 0,
        lines: 0,
        announces: unannounced,
      };
      let H = h.waitForTheThread === undefined ? undefined : D(h);
      return H === undefined
        ? M
        : {
            bytes: Buffer.concat([M.bytes, H.bytes]),
            offset: 0,
            lines: H.lines,
            announces: unannounced,
            notice: L,
          };
    }
    return D(h);
  }
  function D(h) {
    let y = h.waiting.shift();
    if (y === undefined) return;
    h.waitingBytes -= y.bytes.length;
    if (h.waitForTheThread === undefined)
      return {
        bytes: y.bytes,
        offset: 0,
        lines: y.lines,
        announces: 0,
      };
    let v = [y];
    let L = y.bytes.length;
    while (h.waiting.length > 0 && L + h.waiting[0].bytes.length <= THREAD_WRITE_CHUNK_BYTES) {
      let M = h.waiting.shift();
      h.waitingBytes -= M.bytes.length;
      L += M.bytes.length;
      v.push(M);
    }
    return {
      bytes:
        v.length === 1
          ? y.bytes
          : Buffer.concat(
              v.map((M) => M.bytes),
              L,
            ),
      offset: 0,
      lines: v.reduce((acc, H) => acc + H.lines, 0),
      announces: 0,
    };
  }
  function R(h, head) {
    if (head.announces > 0) {
      e.onOwnLine?.(head.notice ?? head.bytes.toString().trimEnd());
      if (h.unannounced === 0) h.unannouncedSinceMs = undefined;
    }
    h.retryMs = MAX_RECENT_REQUESTS;
  }
  function A(h, y = "stdout") {
    let v = e.stamp(h);
    e.onOwnLine?.(v);
    if (!S) ne.write(y, v);
  }
  function F(h, y) {
    h.waiting.push(y);
    h.waitingBytes += y.bytes.length;
    while (h.waitingBytes > MAX_REQUEST_BODY_BYTES && h.waiting.length > 1) {
      let v = h.waiting.shift();
      h.waitingBytes -= v.bytes.length;
      T(h, v.lines);
    }
  }
  function K(h) {
    h.write = (y, v) => io.writeSync(h.fd, y, v);
    h.waitForTheThread = undefined;
    h.via = "the descriptor this process was given";
    h.because = `${h.because ?? "it could not be opened a second time"}, and no thread could write to it`;
    A(
      `[runner:warn] The thread that writes this process's ${h.name} could not start, or it stopped, so this process writes there itself. If nothing reads ${h.name}, that can hold this process up. Make sure something reads it, such as the journal or a log file.`,
      h === t ? "stderr" : "stdout",
    );
  }
  function X(h, head, v) {
    let L = !l.has(`${h.name} ${v}`);
    l.add(`${h.name} ${v}`);
    let M =
      head.offset === 0
        ? head
        : {
            bytes: head.bytes.subarray(head.offset),
            lines: countNewlines(head.bytes.subarray(head.offset)),
          };
    if (!STREAM_GONE_CODES.has(v)) {
      c[v] = (c[v] ?? 0) + M.lines;
      if (L)
        A(
          `[runner:warn] A write to this process's ${h.name} failed (${v}), so some log lines are missing there. This process keeps running. If this error happens again on ${h.name}, it will not be reported.`,
          h === t ? "stderr" : "stdout",
        );
      return;
    }
    h.gone = true;
    let H = [M, ...h.waiting];
    h.waiting = [];
    h.waitingBytes = 0;
    h.unannounced = 0;
    h.unannouncedSinceMs = undefined;
    A(
      `[runner:warn] Nobody can read this process's ${h.name} anymore (${v}), so nothing more is written there.` +
        (h === t && !i.gone ? " Status lines go to stderr from here on." : ""),
    );
    if (h === t && !i.gone) {
      for (let Q of H)
        if (Q.lines > 0)
          F(i, {
            bytes: Q.bytes,
            lines: Q.lines,
          });
      q(i);
    }
  }
  function V(h) {
    while (!h.gone) {
      h.head ??= N(h);
      let head = h.head;
      if (head === undefined) return;
      let v = "EAGAIN";
      try {
        let L = h.write(head.bytes, head.offset);
        head.offset += L;
        if (L > 0) {
          if (head.offset >= head.bytes.length) {
            h.head = undefined;
            R(h, head);
          }
          continue;
        }
      } catch (error) {
        v = getErrnoCode(error) ?? "unknown";
      }
      if (v === "EINTR") continue;
      if (v === "NO_THREAD") {
        K(h);
        continue;
      }
      if (v !== "EAGAIN" && v !== "EINPROGRESS") {
        h.head = undefined;
        X(h, head, v);
        continue;
      }
      if (v === "EAGAIN" && head.offset === 0) {
        h.head = undefined;
        h.unannounced += head.announces;
        if (head.announces === 0) {
          h.waiting.unshift({
            bytes: head.bytes,
            lines: head.lines,
          });
          h.waitingBytes += head.bytes.length;
        }
      }
      if (!w && !S && h.cancelRetry === undefined) {
        h.cancelRetry = clock.setTimeout(
          () => {
            h.cancelRetry = undefined;
            q(h);
          },
          h.retryMs,
          {
            unref: true,
          },
        );
        h.retryMs = Math.min(h.retryMs * 2, HEALTH_PORT_LOW);
      }
      return;
    }
  }
  function q(h) {
    if (!w) V(h);
  }
  function ae(h) {
    let y = clock.monotonicNow() + h;
    for (;;) {
      for (let H of s) q(H);
      let any = s.some((H) => H.head !== undefined || H.waiting.length > 0);
      let L = y - clock.monotonicNow();
      if (!any || L <= 0) return;
      let found = s.find((H) => H.head !== undefined && H.waitForTheThread !== undefined);
      if (found?.waitForTheThread) found.waitForTheThread(Math.min(L, HEALTH_PORT_LOW));
      else io.sleep(Math.min(L, MAX_RECENT_REQUESTS));
    }
  }
  let Z = () => {
    S = true;
    ae(HEALTH_PORT_HIGH);
  };
  let ne = {
    write(h, y) {
      let v = h === "stdout" ? t : i;
      let L = v.gone ? i : v;
      if (w || L.gone) return;
      F(L, {
        bytes: Buffer.from(
          y +
            `
`,
        ),
        lines: 1,
      });
      q(L);
    },
    stats: () => ({
      queuedBytes: s.reduce(
        (acc, y) => acc + y.waitingBytes + (y.head ? y.head.bytes.length - y.head.offset : 0),
        0,
      ),
      droppedLines,
      failedLines: {
        ...c,
      },
    }),
    describe: () =>
      "log lines reach " +
      s
        .map(
          (h) =>
            `${h.name}${a ? " (same place)" : ""} through ${h.via}` +
            (h.because === undefined ? "" : ` (because ${h.because})`),
        )
        .join("; "),
    close() {
      if (w) return;
      S = true;
      ae(HEALTH_PORT_HIGH);
      w = true;
      process.off("exit", Z);
      for (let h of s) h.cancelRetry?.();
    },
  };
  process.on("exit", Z);
  return ne;
}
export { openStdioWriter };
