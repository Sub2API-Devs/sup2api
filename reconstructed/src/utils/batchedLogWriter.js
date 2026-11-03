/**
 * utils/batchedLogWriter.ts
 *
 * 2.1.316 新增：按文件批量写日志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k7fgdyw5.js (3)
 * attribution: sole-consumer 1, placement 2
 */
import { dirname } from "path";
import { createBufferedWriter_2 } from "./bufferedWriter.js";
import { jsonStringify } from "./slowOperations.js";
import { createKeyedQueue } from "./promiseQueue.js";
import { appendToFile } from "../services/api/dumpPrompts.js";
import { logForDebugging } from "./debug.js";
import { registerCleanup, registerPreExitFlush } from "./cleanupRegistry.js";

//@ chunk-k7fgdyw5.js:796-891 sole-consumer = createJsonlWriter (1)
function createJsonlWriter(options) {
  let writer = createBufferedWriter_2(options);
  return {
    write(o) {
      writer.write(
        jsonStringify(o) +
          `
`,
      );
    },
    flush: writer.flush,
    dispose: writer.dispose,
  };
}
//@ chunk-k7fgdyw5.js:891-905 placement
function noop() {}
/**
 * 按文件批量追加写日志，同一文件的写入排队执行。
 */
//@ chunk-k7fgdyw5.js:905-1618 placement
class BatchedLogWriter {
  writers = new Map();
  pendingWrites = createKeyedQueue();
  writerFor(e) {
    let r = this.writers.get(e);
    if (!r) {
      let o = dirname(e),
        s = !1;
      ((r = createJsonlWriter({
        writeFn: (n) => {
          this.pendingWrites.run(e, async () => {
            try {
              await appendToFile(o, e, n);
            } catch (error) {
              if (!s)
                ((s = !0),
                  logForDebugging(
                    `Dropping log batch for ${e}: ${error instanceof Error ? error.message : String(error)}`,
                  ));
            }
          });
        },
        flushIntervalMs: 1000,
        maxBufferSize: 50,
      })),
        this.writers.set(e, r),
        registerCleanup(async () => {
          (r?.dispose(), await this.pendingWrites.settle());
        }),
        registerPreExitFlush(this.flushBeforeExit));
    }
    return r;
  }
  async flush() {
    for (let e of this.writers.values()) e.flush();
    await this.pendingWrites.settle();
  }
  flushBeforeExit = () => this.flush();
  async reset() {
    for (let e of this.writers.values()) e.dispose();
    (await this.pendingWrites.settle(), this.writers.clear(), this.pendingWrites.clearForTest());
  }
}

export { noop, BatchedLogWriter };
