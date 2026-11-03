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

/**
 * 批量写入器：缓冲条目，达到条数/字节上限或定时（默认 1 秒）时调用 writeBatch；immediateMode 时每条立即写。
 */
//@ chunk-cgr0tezp.js:14556-15113 fingerprint = createBufferedWriter (0.778)
function createBufferedWriter({
  writeBatch: writeBatch,
  sizeOf: sizeOf,
  flushIntervalMs: flushIntervalMs = 1000,
  maxBufferSize: maxBufferSize = 100,
  maxBufferBytes: maxBufferBytes = 1 / 0,
  immediateMode: immediateMode = !1,
}) {
  let buffer = [],
    bufferBytes = 0,
    flushTimer = null,
    pendingOverflow = null;
  function clearTimer() {
    if (flushTimer) (clearTimeout(flushTimer), (flushTimer = null));
  }
  function g(f) {
    try {
      writeBatch(f);
    } catch {}
  }
  function flush() {
    if (pendingOverflow) (g(pendingOverflow), (pendingOverflow = null));
    if (buffer.length === 0) return;
    (g(buffer), (buffer = []), (bufferBytes = 0), clearTimer());
  }
  function scheduleFlush() {
    if (!flushTimer) flushTimer = setTimeout(flush, flushIntervalMs);
  }
  function flushDeferred() {
    if (pendingOverflow) {
      (pendingOverflow.push(...buffer), (buffer = []), (bufferBytes = 0), clearTimer());
      return;
    }
    let f = buffer;
    ((buffer = []),
      (bufferBytes = 0),
      clearTimer(),
      (pendingOverflow = f),
      setImmediate(() => {
        let m = pendingOverflow;
        if (((pendingOverflow = null), m)) g(m);
      }));
  }
  return {
    write(f) {
      if (immediateMode) {
        g([f]);
        return;
      }
      if (
        (buffer.push(f),
        (bufferBytes += sizeOf(f)),
        scheduleFlush(),
        buffer.length >= maxBufferSize || bufferBytes >= maxBufferBytes)
      )
        flushDeferred();
    },
    flush: flush,
    dispose() {
      flush();
    },
  };
}
//@ chunk-cgr0tezp.js:15113-15337 affinity = createBufferedWriter (0.761)
function createBufferedWriter_2({
  writeFn: writeFn,
  flushIntervalMs: flushIntervalMs,
  maxBufferSize: maxBufferSize,
  maxBufferBytes: maxBufferBytes,
  immediateMode: immediateMode,
}) {
  return createBufferedWriter({
    writeBatch: (o) => writeFn(o.join("")),
    sizeOf: (o) => o.length,
    flushIntervalMs: flushIntervalMs,
    maxBufferSize: maxBufferSize,
    maxBufferBytes: maxBufferBytes,
    immediateMode: immediateMode,
  });
}

export { createBufferedWriter, createBufferedWriter_2 };
