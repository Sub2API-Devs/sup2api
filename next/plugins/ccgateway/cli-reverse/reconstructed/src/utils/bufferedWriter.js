/**
 * utils/bufferedWriter.ts
 *
 * 批量写入器：按条数、字节或时间间隔把缓冲的条目批量写出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bufferedWriter.ts
 * pieces: chunk-cgr0tezp.js (2)
 * attribution: fingerprint 1, affinity 1
 */

//@ chunk-cgr0tezp.js:14556-15113 fingerprint (2.1.88 match: createBufferedWriter, 0.778)
/**
 * 批量写入器：缓冲条目，达到条数/字节上限或定时（默认 1 秒）时调用 writeBatch；immediateMode 时每条立即写。
 */
function createBufferedWriter({
  writeBatch,
  sizeOf,
  flushIntervalMs = 1000,
  maxBufferSize = 100,
  maxBufferBytes = 1 / 0,
  immediateMode = false,
}) {
  let buffer = [];
  let bufferBytes = 0;
  let flushTimer = null;
  let pendingOverflow = null;
  function clearTimer() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
  function writeFn(entries) {
    try {
      writeBatch(entries);
    } catch {}
  }
  function flush() {
    if (pendingOverflow) {
      writeFn(pendingOverflow);
      pendingOverflow = null;
    }
    if (buffer.length === 0) return;
    writeFn(buffer);
    buffer = [];
    bufferBytes = 0;
    clearTimer();
  }
  function scheduleFlush() {
    if (!flushTimer) flushTimer = setTimeout(flush, flushIntervalMs);
  }
  function flushDeferred() {
    if (pendingOverflow) {
      pendingOverflow.push(...buffer);
      buffer = [];
      bufferBytes = 0;
      clearTimer();
      return;
    }
    let detached = buffer;
    buffer = [];
    bufferBytes = 0;
    clearTimer();
    pendingOverflow = detached;
    setImmediate(() => {
      let toWrite = pendingOverflow;
      pendingOverflow = null;
      if (toWrite) writeFn(toWrite);
    });
  }
  return {
    write(content) {
      if (immediateMode) {
        writeFn([content]);
        return;
      }
      buffer.push(content);
      bufferBytes += sizeOf(content);
      scheduleFlush();
      if (buffer.length >= maxBufferSize || bufferBytes >= maxBufferBytes) flushDeferred();
    },
    flush,
    dispose() {
      flush();
    },
  };
}
//@ chunk-cgr0tezp.js:15113-15337 affinity (2.1.88 match: createBufferedWriter, 0.761)
function createBufferedWriter_2({ writeFn, flushIntervalMs, maxBufferSize, maxBufferBytes, immediateMode }) {
  return createBufferedWriter({
    writeBatch: (items) => writeFn(items.join("")),
    sizeOf: (item) => item.length,
    flushIntervalMs,
    maxBufferSize,
    maxBufferBytes,
    immediateMode,
  });
}
export { createBufferedWriter, createBufferedWriter_2 };
