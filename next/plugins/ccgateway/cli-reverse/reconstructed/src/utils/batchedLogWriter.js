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

//@ chunk-k7fgdyw5.js:796-891 sole-consumer (2.1.88 match: createJsonlWriter, 1)
function createJsonlWriter(options) {
  let writer = createBufferedWriter_2(options);
  return {
    write(obj) {
      writer.write(
        jsonStringify(obj) +
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
//@ chunk-k7fgdyw5.js:905-1618 placement
/**
 * 按文件批量追加写日志，同一文件的写入排队执行。
 */
class BatchedLogWriter {
  writers = new Map();
  pendingWrites = createKeyedQueue();
  writerFor(filePath) {
    let writer = this.writers.get(filePath);
    if (!writer) {
      let dirPath = dirname(filePath);
      let hasLoggedDrop = false;
      writer = createJsonlWriter({
        writeFn: (chunk) => {
          this.pendingWrites.run(filePath, async () => {
            try {
              await appendToFile(dirPath, filePath, chunk);
            } catch (error) {
              if (!hasLoggedDrop) {
                hasLoggedDrop = true;
                logForDebugging(
                  `Dropping log batch for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
          });
        },
        flushIntervalMs: 1000,
        maxBufferSize: 50,
      });
      this.writers.set(filePath, writer);
      registerCleanup(async () => {
        writer?.dispose();
        await this.pendingWrites.settle();
      });
      registerPreExitFlush(this.flushBeforeExit);
    }
    return writer;
  }
  async flush() {
    for (let writer of this.writers.values()) writer.flush();
    await this.pendingWrites.settle();
  }
  flushBeforeExit = () => this.flush();
  async reset() {
    for (let writer of this.writers.values()) writer.dispose();
    await this.pendingWrites.settle();
    this.writers.clear();
    this.pendingWrites.clearForTest();
  }
}
export { noop, BatchedLogWriter };
