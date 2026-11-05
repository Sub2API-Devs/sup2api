/**
 * selfHostedRunner/stdioWriter.ts
 *
 * runner 标准输出写入器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a3r2kq46.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-a3r2kq46.js:28284-31649 placement
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
  openOwn(fd) {
    try {
      if (isatty(fd)) {
        let nonBlockingStdoutFd = openNonBlockingStdoutFd(fd);
        return (
          nonBlockingStdoutFd.fd ?? {
            refused: `the terminal could not be opened a second time: ${nonBlockingStdoutFd.errno ?? nonBlockingStdoutFd.reason}`,
            writtenHere: getPlatform() === "windows",
          }
        );
      }
      let stat = fstatSync(fd);
      if (!stat.isFIFO())
        return {
          refused: stat.isSocket()
            ? "a socket cannot be opened a second time"
            : "only a terminal, or a pipe on Linux, can be opened a second time",
          writtenHere: stat.isFile() || stat.isCharacterDevice() || getPlatform() === "windows",
        };
      return openSync(`/proc/self/fd/${fd}`, constants.O_WRONLY | constants.O_NONBLOCK | READ_LIMITS);
    } catch (error) {
      return {
        refused: `it could not be opened a second time: ${getErrnoCode(error) ?? "unknown"}`,
        writtenHere: getPlatform() === "windows",
      };
    }
  },
  sameFile(firstPath, secondPath) {
    try {
      let [firstStat, secondStat] = [fstatSync(firstPath), fstatSync(secondPath)];
      return (
        firstStat.dev === secondStat.dev &&
        firstStat.ino === secondStat.ino &&
        firstStat.rdev === secondStat.rdev
      );
    } catch {
      return false;
    }
  },
  writeSync: (fd, buffer, offset) => writeSync(fd, buffer, offset),
  writeOnAThread(fd, onmessage) {
    let int32Array = new Int32Array(new SharedArrayBuffer(16));
    let worker;
    let lastWriteAt;
    let errorCode;
    try {
      let workerUrl = URL.createObjectURL(
        new Blob([WRITER_THREAD_SOURCE], {
          type: "application/javascript",
        }),
      );
      worker = new Worker(workerUrl);
      worker.unref?.();
      worker.onmessage = onmessage;
      worker.onerror = () => {
        worker = undefined;
      };
      worker.postMessage({
        fd,
        shared: int32Array,
        errnos: WRITE_ERRNOS,
      });
    } catch {
      worker = undefined;
    }
    let reportCode = (code) => {
      throw Object.assign(Error("the thread did not write the bytes"), {
        code,
      });
    };
    return {
      write: (buffer, offset) => {
        if (errorCode !== undefined) {
          let code = errorCode;
          errorCode = undefined;
          reportCode(code);
        }
        let slot = Atomics.load(int32Array, 0);
        if (slot === SLOT_DONE) {
          let [errnoValue, writtenBytes] = [Atomics.load(int32Array, 1), Atomics.load(int32Array, 2)];
          Atomics.store(int32Array, 0, SLOT_IDLE);
          if (writtenBytes > 0) {
            let code = WRITE_ERRNOS[writtenBytes - 1] ?? "unknown";
            if (errnoValue === 0) reportCode(code);
            errorCode = code;
          }
          return errnoValue;
        }
        if (
          slot === SLOT_WRITING &&
          Atomics.load(int32Array, 3) === 0 &&
          lastWriteAt !== undefined &&
          performance.now() - lastWriteAt > THREAD_START_TIMEOUT_MS
        ) {
          worker?.terminate();
          worker = undefined;
          Atomics.store(int32Array, 0, SLOT_IDLE);
        }
        if (worker === undefined)
          throw Object.assign(Error("the thread could not be started"), {
            code: "NO_THREAD",
          });
        if (slot === SLOT_IDLE) {
          Atomics.store(int32Array, 0, SLOT_WRITING);
          lastWriteAt = performance.now();
          worker.postMessage(
            Uint8Array.prototype.slice.call(buffer, offset, offset + THREAD_WRITE_CHUNK_BYTES),
          );
        }
        throw Object.assign(Error("the thread has the bytes"), {
          code: "EINPROGRESS",
        });
      },
      wait(timeoutMs) {
        Atomics.wait(int32Array, 0, SLOT_WRITING, timeoutMs);
      },
    };
  },
  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  },
};
//@ chunk-a3r2kq46.js:31649-36717 placement
/**
 * 打开 runner 的标准输出写入器（非阻塞描述符、独立线程、EPIPE 处理）
 */
function openStdioWriter(options) {
  let io = options.io ?? stdioWriterOps;
  let clock = options.clock ?? systemClock;
  let openOne = (fd, name) => {
    let opened = io.openOwn(fd);
    let target = typeof opened === "number" ? opened : fd;
    let info =
      typeof opened === "number" || opened.writtenHere
        ? undefined
        : io.writeOnAThread(fd, () => flush(channel));
    let channel = {
      name,
      fd: target,
      via:
        typeof opened === "number"
          ? "a non-blocking descriptor"
          : opened.writtenHere
            ? "the descriptor this process was given"
            : "the descriptor this process was given, on a thread of its own",
      because: typeof opened === "number" ? undefined : opened.refused,
      write: info?.write ?? ((buffer, offset) => io.writeSync(target, buffer, offset)),
      waitForTheThread: info?.wait,
      waiting: [],
      waitingBytes: 0,
      gone: false,
      unannounced: 0,
      retryMs: MAX_RECENT_REQUESTS,
    };
    return channel;
  };
  let sameTarget = io.sameFile(1, 2);
  let stdoutChannel = openOne(1, sameTarget ? "stdout and stderr" : "stdout");
  let stderrChannel = sameTarget ? stdoutChannel : openOne(2, "stderr");
  let channels = sameTarget ? [stdoutChannel] : [stdoutChannel, stderrChannel];
  let failedLines = {};
  let reportedErrors = new Set();
  let droppedLines = 0;
  let closed = false;
  let exiting = false;
  function noteDropped(channel, lines) {
    channel.unannouncedSinceMs ??= clock.monotonicNow();
    channel.unannounced += lines;
    droppedLines += lines;
  }
  function takeNext(channel) {
    if (channel.unannounced > 0) {
      let unannounced = channel.unannounced;
      channel.unannounced = 0;
      let max = Math.max(1, Math.ceil((clock.monotonicNow() - (channel.unannouncedSinceMs ?? 0)) / 1000));
      let notice = options.stamp(
        `[runner:log] ${unannounced === 1 ? "1 log line" : `${unannounced} log lines`} to ${channel.name} ${unannounced === 1 ? "was" : "were"} dropped over ${max} s: whatever reads ${channel.name} was paused or too slow`,
      );
      let noticeHead = {
        bytes: Buffer.from(
          notice +
            `
`,
        ),
        offset: 0,
        lines: 0,
        announces: unannounced,
      };
      let buffered = channel.waitForTheThread === undefined ? undefined : takeQueued(channel);
      return buffered === undefined
        ? noticeHead
        : {
            bytes: Buffer.concat([noticeHead.bytes, buffered.bytes]),
            offset: 0,
            lines: buffered.lines,
            announces: unannounced,
            notice,
          };
    }
    return takeQueued(channel);
  }
  function takeQueued(channel) {
    let first = channel.waiting.shift();
    if (first === undefined) return;
    channel.waitingBytes -= first.bytes.length;
    if (channel.waitForTheThread === undefined)
      return {
        bytes: first.bytes,
        offset: 0,
        lines: first.lines,
        announces: 0,
      };
    let parts = [first];
    let totalBytes = first.bytes.length;
    while (
      channel.waiting.length > 0 &&
      totalBytes + channel.waiting[0].bytes.length <= THREAD_WRITE_CHUNK_BYTES
    ) {
      let next = channel.waiting.shift();
      channel.waitingBytes -= next.bytes.length;
      totalBytes += next.bytes.length;
      parts.push(next);
    }
    return {
      bytes:
        parts.length === 1
          ? first.bytes
          : Buffer.concat(
              parts.map((part) => part.bytes),
              totalBytes,
            ),
      offset: 0,
      lines: parts.reduce((acc, part) => acc + part.lines, 0),
      announces: 0,
    };
  }
  function afterHeadWritten(channel, head) {
    if (head.announces > 0) {
      options.onOwnLine?.(head.notice ?? head.bytes.toString().trimEnd());
      if (channel.unannounced === 0) channel.unannouncedSinceMs = undefined;
    }
    channel.retryMs = MAX_RECENT_REQUESTS;
  }
  function stampAndWrite(text, target = "stdout") {
    let stamped = options.stamp(text);
    options.onOwnLine?.(stamped);
    if (!exiting) writerApi.write(target, stamped);
  }
  function enqueue(channel, head) {
    channel.waiting.push(head);
    channel.waitingBytes += head.bytes.length;
    while (channel.waitingBytes > MAX_REQUEST_BODY_BYTES && channel.waiting.length > 1) {
      let dropped = channel.waiting.shift();
      channel.waitingBytes -= dropped.bytes.length;
      noteDropped(channel, dropped.lines);
    }
  }
  function fallBackToSyncWrites(channel) {
    channel.write = (buffer, offset) => io.writeSync(channel.fd, buffer, offset);
    channel.waitForTheThread = undefined;
    channel.via = "the descriptor this process was given";
    channel.because = `${channel.because ?? "it could not be opened a second time"}, and no thread could write to it`;
    stampAndWrite(
      `[runner:warn] The thread that writes this process's ${channel.name} could not start, or it stopped, so this process writes there itself. If nothing reads ${channel.name}, that can hold this process up. Make sure something reads it, such as the journal or a log file.`,
      channel === stdoutChannel ? "stderr" : "stdout",
    );
  }
  function markWriteFailed(channel, head, code) {
    let firstForCode = !reportedErrors.has(`${channel.name} ${code}`);
    reportedErrors.add(`${channel.name} ${code}`);
    let remaining =
      head.offset === 0
        ? head
        : {
            bytes: head.bytes.subarray(head.offset),
            lines: countNewlines(head.bytes.subarray(head.offset)),
          };
    if (!STREAM_GONE_CODES.has(code)) {
      failedLines[code] = (failedLines[code] ?? 0) + remaining.lines;
      if (firstForCode)
        stampAndWrite(
          `[runner:warn] A write to this process's ${channel.name} failed (${code}), so some log lines are missing there. This process keeps running. If this error happens again on ${channel.name}, it will not be reported.`,
          channel === stdoutChannel ? "stderr" : "stdout",
        );
      return;
    }
    channel.gone = true;
    let heads = [remaining, ...channel.waiting];
    channel.waiting = [];
    channel.waitingBytes = 0;
    channel.unannounced = 0;
    channel.unannouncedSinceMs = undefined;
    stampAndWrite(
      `[runner:warn] Nobody can read this process's ${channel.name} anymore (${code}), so nothing more is written there.` +
        (channel === stdoutChannel && !stderrChannel.gone ? " Status lines go to stderr from here on." : ""),
    );
    if (channel === stdoutChannel && !stderrChannel.gone) {
      for (let head of heads)
        if (head.lines > 0)
          enqueue(stderrChannel, {
            bytes: head.bytes,
            lines: head.lines,
          });
      flush(stderrChannel);
    }
  }
  function pump(channel) {
    while (!channel.gone) {
      channel.head ??= takeNext(channel);
      let head = channel.head;
      if (head === undefined) return;
      let code = "EAGAIN";
      try {
        let written = channel.write(head.bytes, head.offset);
        head.offset += written;
        if (written > 0) {
          if (head.offset >= head.bytes.length) {
            channel.head = undefined;
            afterHeadWritten(channel, head);
          }
          continue;
        }
      } catch (error) {
        code = getErrnoCode(error) ?? "unknown";
      }
      if (code === "EINTR") continue;
      if (code === "NO_THREAD") {
        fallBackToSyncWrites(channel);
        continue;
      }
      if (code !== "EAGAIN" && code !== "EINPROGRESS") {
        channel.head = undefined;
        markWriteFailed(channel, head, code);
        continue;
      }
      if (code === "EAGAIN" && head.offset === 0) {
        channel.head = undefined;
        channel.unannounced += head.announces;
        if (head.announces === 0) {
          channel.waiting.unshift({
            bytes: head.bytes,
            lines: head.lines,
          });
          channel.waitingBytes += head.bytes.length;
        }
      }
      if (!closed && !exiting && channel.cancelRetry === undefined) {
        channel.cancelRetry = clock.setTimeout(
          () => {
            channel.cancelRetry = undefined;
            flush(channel);
          },
          channel.retryMs,
          {
            unref: true,
          },
        );
        channel.retryMs = Math.min(channel.retryMs * 2, HEALTH_PORT_LOW);
      }
      return;
    }
  }
  function flush(channel) {
    if (!closed) pump(channel);
  }
  function drainFor(budgetMs) {
    let deadline = clock.monotonicNow() + budgetMs;
    for (;;) {
      for (let channel of channels) flush(channel);
      let any = channels.some((channel) => channel.head !== undefined || channel.waiting.length > 0);
      let remainingMs = deadline - clock.monotonicNow();
      if (!any || remainingMs <= 0) return;
      let found = channels.find(
        (channel) => channel.head !== undefined && channel.waitForTheThread !== undefined,
      );
      if (found?.waitForTheThread) found.waitForTheThread(Math.min(remainingMs, HEALTH_PORT_LOW));
      else io.sleep(Math.min(remainingMs, MAX_RECENT_REQUESTS));
    }
  }
  let onProcessExit = () => {
    exiting = true;
    drainFor(HEALTH_PORT_HIGH);
  };
  let writerApi = {
    write(target, text) {
      let channel = target === "stdout" ? stdoutChannel : stderrChannel;
      let destination = channel.gone ? stderrChannel : channel;
      if (closed || destination.gone) return;
      enqueue(destination, {
        bytes: Buffer.from(
          text +
            `
`,
        ),
        lines: 1,
      });
      flush(destination);
    },
    stats: () => ({
      queuedBytes: channels.reduce(
        (acc, channel) =>
          acc + channel.waitingBytes + (channel.head ? channel.head.bytes.length - channel.head.offset : 0),
        0,
      ),
      droppedLines,
      failedLines: {
        ...failedLines,
      },
    }),
    describe: () =>
      "log lines reach " +
      channels
        .map(
          (channel) =>
            `${channel.name}${sameTarget ? " (same place)" : ""} through ${channel.via}` +
            (channel.because === undefined ? "" : ` (because ${channel.because})`),
        )
        .join("; "),
    close() {
      if (closed) return;
      exiting = true;
      drainFor(HEALTH_PORT_HIGH);
      closed = true;
      process.off("exit", onProcessExit);
      for (let channel of channels) channel.cancelRetry?.();
    },
  };
  process.on("exit", onProcessExit);
  return writerApi;
}
export { openStdioWriter };
