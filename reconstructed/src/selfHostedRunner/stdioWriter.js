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
import { fstatSync, openSync, constants, constants as constants_2, writeSync } from "fs";
import { openNonBlockingStdoutFd } from "../ink/nonBlockingStdout.js";
import { getPlatform } from "../utils/platform.js";
import { READ_LIMITS } from "../utils/fsBoundRead.js";
import { getErrnoCode } from "../utils/errors.js";
import { Aa } from "../utils/sleep.js";
import { ye, Ln, Cn, Ke, We } from "./healthServer.js";
import { STREAM_GONE_CODES } from "../utils/process.js";

/**
 * runner 标准输出写入器的底层操作：openOwn 重新打开 fd（终端或 Linux 管道）为非阻塞，sameFile 比较是否同一文件，writeOnAThread 在 Worker 线程用 SharedArrayBuffer 同步写（按整行、不超过 PIPE_BUF），sleep 用 Atomics.wait。
 */
//@ chunk-3nztfxrw.js:27630-30995 placement
var [SLOT_IDLE, SLOT_WRITING, SLOT_DONE] = [0, 1, 2],
  THREAD_WRITE_CHUNK_BYTES = 65536,
  THREAD_START_TIMEOUT_MS = 5000,
  WRITE_ERRNOS = ["EPIPE", "ECONNRESET", "ENXIO", "EBADF", "EIO", "ENOSPC", "EINVAL"],
  WRITER_THREAD_SOURCE = `
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
`,
  stdioWriterOps = {
    openOwn(e) {
      try {
        if (isatty(e)) {
          let r = openNonBlockingStdoutFd(e);
          return (
            r.fd ?? {
              refused: `the terminal could not be opened a second time: ${r.errno ?? r.reason}`,
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
        return !1;
      }
    },
    writeSync: (e, n, r) => writeSync(e, n, r),
    writeOnAThread(e, n) {
      let int32Array = new Int32Array(new SharedArrayBuffer(16)),
        m,
        a,
        t;
      try {
        let objectURL = URL.createObjectURL(
          new Blob([WRITER_THREAD_SOURCE], { type: "application/javascript" }),
        );
        ((m = new Worker(objectURL)),
          m.unref?.(),
          (m.onmessage = n),
          (m.onerror = () => {
            m = void 0;
          }),
          m.postMessage({ fd: e, shared: int32Array, errnos: WRITE_ERRNOS }));
      } catch {
        m = void 0;
      }
      let i = (c) => {
        throw Object.assign(Error("the thread did not write the bytes"), { code: c });
      };
      return {
        write: (c, l) => {
          if (t !== void 0) {
            let w = t;
            ((t = void 0), i(w));
          }
          let load = Atomics.load(int32Array, 0);
          if (load === SLOT_DONE) {
            let [w, S] = [Atomics.load(int32Array, 1), Atomics.load(int32Array, 2)];
            if ((Atomics.store(int32Array, 0, SLOT_IDLE), S > 0)) {
              let T = WRITE_ERRNOS[S - 1] ?? "unknown";
              if (w === 0) i(T);
              t = T;
            }
            return w;
          }
          if (
            load === SLOT_WRITING &&
            Atomics.load(int32Array, 3) === 0 &&
            a !== void 0 &&
            performance.now() - a > THREAD_START_TIMEOUT_MS
          )
            (m?.terminate(), (m = void 0), Atomics.store(int32Array, 0, SLOT_IDLE));
          if (m === void 0)
            throw Object.assign(Error("the thread could not be started"), { code: "NO_THREAD" });
          if (load === SLOT_IDLE)
            (Atomics.store(int32Array, 0, SLOT_WRITING),
              (a = performance.now()),
              m.postMessage(Uint8Array.prototype.slice.call(c, l, l + THREAD_WRITE_CHUNK_BYTES)));
          throw Object.assign(Error("the thread has the bytes"), { code: "EINPROGRESS" });
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
/**
 * 打开 runner 的标准输出写入器（非阻塞描述符、独立线程、EPIPE 处理）
 */
//@ chunk-3nztfxrw.js:30995-36063 placement
function openStdioWriter(e) {
  let n = e.io ?? stdioWriterOps,
    r = e.clock ?? Aa,
    m = (h, y) => {
      let openOwn = n.openOwn(h),
        L = typeof openOwn === "number" ? openOwn : h,
        M = typeof openOwn === "number" || openOwn.writtenHere ? void 0 : n.writeOnAThread(h, () => q(H)),
        H = {
          name: y,
          fd: L,
          via:
            typeof openOwn === "number"
              ? "a non-blocking descriptor"
              : openOwn.writtenHere
                ? "the descriptor this process was given"
                : "the descriptor this process was given, on a thread of its own",
          because: typeof openOwn === "number" ? void 0 : openOwn.refused,
          write: M?.write ?? ((Q, oe) => n.writeSync(L, Q, oe)),
          waitForTheThread: M?.wait,
          waiting: [],
          waitingBytes: 0,
          gone: !1,
          unannounced: 0,
          retryMs: ye,
        };
      return H;
    },
    sameFile = n.sameFile(1, 2),
    t = m(1, sameFile ? "stdout and stderr" : "stdout"),
    i = sameFile ? t : m(2, "stderr"),
    s = sameFile ? [t] : [t, i],
    c = {},
    l = new Set(),
    b = 0,
    w = !1,
    S = !1;
  function T(h, y) {
    ((h.unannouncedSinceMs ??= r.monotonicNow()), (h.unannounced += y), (b += y));
  }
  function N(h) {
    if (h.unannounced > 0) {
      let unannounced = h.unannounced;
      h.unannounced = 0;
      let max = Math.max(1, Math.ceil((r.monotonicNow() - (h.unannouncedSinceMs ?? 0)) / 1000)),
        stamp = e.stamp(
          `[runner:log] ${unannounced === 1 ? "1 log line" : `${unannounced} log lines`} to ${h.name} ${unannounced === 1 ? "was" : "were"} dropped over ${max} s: whatever reads ${h.name} was paused or too slow`,
        ),
        M = {
          bytes: Buffer.from(
            stamp +
              `
`,
          ),
          offset: 0,
          lines: 0,
          announces: unannounced,
        },
        H = h.waitForTheThread === void 0 ? void 0 : D(h);
      return H === void 0
        ? M
        : {
            bytes: Buffer.concat([M.bytes, H.bytes]),
            offset: 0,
            lines: H.lines,
            announces: unannounced,
            notice: stamp,
          };
    }
    return D(h);
  }
  function D(h) {
    let y = h.waiting.shift();
    if (y === void 0) return;
    if (((h.waitingBytes -= y.bytes.length), h.waitForTheThread === void 0))
      return { bytes: y.bytes, offset: 0, lines: y.lines, announces: 0 };
    let v = [y],
      L = y.bytes.length;
    while (h.waiting.length > 0 && L + h.waiting[0].bytes.length <= THREAD_WRITE_CHUNK_BYTES) {
      let M = h.waiting.shift();
      ((h.waitingBytes -= M.bytes.length), (L += M.bytes.length), v.push(M));
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
      lines: v.reduce((M, H) => M + H.lines, 0),
      announces: 0,
    };
  }
  function R(h, y) {
    if (y.announces > 0) {
      if ((e.onOwnLine?.(y.notice ?? y.bytes.toString().trimEnd()), h.unannounced === 0))
        h.unannouncedSinceMs = void 0;
    }
    h.retryMs = ye;
  }
  function A(h, y = "stdout") {
    let stamp = e.stamp(h);
    if ((e.onOwnLine?.(stamp), !S)) ne.write(y, stamp);
  }
  function F(h, y) {
    (h.waiting.push(y), (h.waitingBytes += y.bytes.length));
    while (h.waitingBytes > Ln && h.waiting.length > 1) {
      let v = h.waiting.shift();
      ((h.waitingBytes -= v.bytes.length), T(h, v.lines));
    }
  }
  function K(h) {
    ((h.write = (y, v) => n.writeSync(h.fd, y, v)),
      (h.waitForTheThread = void 0),
      (h.via = "the descriptor this process was given"),
      (h.because = `${h.because ?? "it could not be opened a second time"}, and no thread could write to it`),
      A(
        `[runner:warn] The thread that writes this process's ${h.name} could not start, or it stopped, so this process writes there itself. If nothing reads ${h.name}, that can hold this process up. Make sure something reads it, such as the journal or a log file.`,
        h === t ? "stderr" : "stdout",
      ));
  }
  function X(h, y, v) {
    let L = !l.has(`${h.name} ${v}`);
    l.add(`${h.name} ${v}`);
    let M = y.offset === 0 ? y : { bytes: y.bytes.subarray(y.offset), lines: Cn(y.bytes.subarray(y.offset)) };
    if (!STREAM_GONE_CODES.has(v)) {
      if (((c[v] = (c[v] ?? 0) + M.lines), L))
        A(
          `[runner:warn] A write to this process's ${h.name} failed (${v}), so some log lines are missing there. This process keeps running. If this error happens again on ${h.name}, it will not be reported.`,
          h === t ? "stderr" : "stdout",
        );
      return;
    }
    h.gone = !0;
    let H = [M, ...h.waiting];
    if (
      ((h.waiting = []),
      (h.waitingBytes = 0),
      (h.unannounced = 0),
      (h.unannouncedSinceMs = void 0),
      A(
        `[runner:warn] Nobody can read this process's ${h.name} anymore (${v}), so nothing more is written there.` +
          (h === t && !i.gone ? " Status lines go to stderr from here on." : ""),
      ),
      h === t && !i.gone)
    ) {
      for (let Q of H) if (Q.lines > 0) F(i, { bytes: Q.bytes, lines: Q.lines });
      q(i);
    }
  }
  function V(h) {
    while (!h.gone) {
      h.head ??= N(h);
      let head = h.head;
      if (head === void 0) return;
      let v = "EAGAIN";
      try {
        let write = h.write(head.bytes, head.offset);
        if (((head.offset += write), write > 0)) {
          if (head.offset >= head.bytes.length) ((h.head = void 0), R(h, head));
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
        ((h.head = void 0), X(h, head, v));
        continue;
      }
      if (v === "EAGAIN" && head.offset === 0) {
        if (((h.head = void 0), (h.unannounced += head.announces), head.announces === 0))
          (h.waiting.unshift({ bytes: head.bytes, lines: head.lines }),
            (h.waitingBytes += head.bytes.length));
      }
      if (!w && !S && h.cancelRetry === void 0)
        ((h.cancelRetry = r.setTimeout(
          () => {
            ((h.cancelRetry = void 0), q(h));
          },
          h.retryMs,
          { unref: !0 },
        )),
          (h.retryMs = Math.min(h.retryMs * 2, Ke)));
      return;
    }
  }
  function q(h) {
    if (!w) V(h);
  }
  function ae(h) {
    let y = r.monotonicNow() + h;
    for (;;) {
      for (let H of s) q(H);
      let any = s.some((H) => H.head !== void 0 || H.waiting.length > 0),
        L = y - r.monotonicNow();
      if (!any || L <= 0) return;
      let found = s.find((H) => H.head !== void 0 && H.waitForTheThread !== void 0);
      if (found?.waitForTheThread) found.waitForTheThread(Math.min(L, Ke));
      else n.sleep(Math.min(L, ye));
    }
  }
  let Z = () => {
      ((S = !0), ae(We));
    },
    ne = {
      write(h, y) {
        let v = h === "stdout" ? t : i,
          L = v.gone ? i : v;
        if (w || L.gone) return;
        (F(L, {
          bytes: Buffer.from(
            y +
              `
`,
          ),
          lines: 1,
        }),
          q(L));
      },
      stats: () => ({
        queuedBytes: s.reduce(
          (h, y) => h + y.waitingBytes + (y.head ? y.head.bytes.length - y.head.offset : 0),
          0,
        ),
        droppedLines: b,
        failedLines: { ...c },
      }),
      describe: () =>
        "log lines reach " +
        s
          .map(
            (h) =>
              `${h.name}${sameFile ? " (same place)" : ""} through ${h.via}` +
              (h.because === void 0 ? "" : ` (because ${h.because})`),
          )
          .join("; "),
      close() {
        if (w) return;
        ((S = !0), ae(We), (w = !0), process.off("exit", Z));
        for (let h of s) h.cancelRetry?.();
      },
    };
  return (process.on("exit", Z), ne);
}

export { openStdioWriter };
