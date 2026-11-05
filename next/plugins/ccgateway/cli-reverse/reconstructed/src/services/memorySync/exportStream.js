/**
 * services/memorySync/exportStream.ts
 *
 * 记忆库导出流读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (9)
 * attribution: placement 9
 */
import { StringDecoder } from "string_decoder";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, stringSchema, literal, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { memoryIdSchema } from "../orgMemory/storeErrors.js";
import { withTimeout } from "../../utils/sleep.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:90685-90696 placement
/**
 * 执行器定期让出事件循环的时间预算（200 毫秒）。
 */
var DEFAULT_YIELD_BUDGET_MS = 200;
//@ chunk-7jxyna5q.js:90696-91194 placement
/**
 * 创建并发受限且定期让出事件循环的执行器：runBounded 限制并发数，maybeYield 超过时间预算时让出。
 */
function createYieldingRunner(options = {}) {
  let yieldBudgetMs = options.yieldBudgetMs ?? DEFAULT_YIELD_BUDGET_MS;
  let maxConcurrent = options.maxConcurrent;
  let startTime = performance.now();
  async function maybeYield() {
    if (performance.now() - startTime <= yieldBudgetMs) return;
    await yieldToEventLoop();
    startTime = performance.now();
  }
  let runningCount = 0;
  let waiting = [];
  let nextWaitingIndex = 0;
  function acquireSlot() {
    if (maxConcurrent === undefined || runningCount < maxConcurrent) {
      runningCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiting.push(() => {
        runningCount++;
        resolve();
      });
    });
  }
  function releaseSlot() {
    runningCount--;
    if (nextWaitingIndex >= waiting.length) return;
    let resumeNext = waiting[nextWaitingIndex];
    nextWaitingIndex++;
    if (nextWaitingIndex === waiting.length) {
      waiting.length = 0;
      nextWaitingIndex = 0;
    }
    resumeNext();
  }
  async function runBounded(task) {
    await acquireSlot();
    let result;
    try {
      result = await task();
    } finally {
      releaseSlot();
    }
    await maybeYield();
    return result;
  }
  return {
    maybeYield,
    runBounded,
  };
}
//@ chunk-7jxyna5q.js:91194-91458 placement
var EXPORT_IDLE_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EXPORT_TOTAL_TIMEOUT_MS;
var exportLineTypeSchema;
var exportMemoryLineSchema;
var exportCompleteLineSchema;
deferInit("chunk-7jxyna5q.js:91194", () => {
  EXPORT_IDLE_TIMEOUT_MS = 60000;
  EXPORT_TOTAL_TIMEOUT_MS = 300000;
  exportLineTypeSchema = DoctorLazy(() =>
    looseObject({
      type: stringSchema(),
    }),
  );
  exportMemoryLineSchema = DoctorLazy(() =>
    looseObject({
      type: literal("memory"),
      id: memoryIdSchema(),
      path: stringSchema(),
      content: stringSchema(),
      content_sha256: stringSchema(),
      updated_at: stringSchema(),
    }),
  );
  exportCompleteLineSchema = DoctorLazy(() =>
    looseObject({
      type: literal("complete"),
      memory_count: numberSchema().int().nonnegative(),
      error_count: numberSchema().int().nonnegative().optional(),
    }),
  );
});
//@ chunk-7jxyna5q.js:91458-91566 placement
class LineTooLongError extends Error {
  constructor(maxLineLength) {
    super(`NDJSON line exceeds ${maxLineLength} bytes`);
    this.name = "LineTooLongError";
  }
}
//@ chunk-7jxyna5q.js:91566-91682 placement
class TooManyLinesError extends Error {
  constructor() {
    super("NDJSON stream exceeded its line budget");
    this.name = "TooManyLinesError";
  }
}
//@ chunk-7jxyna5q.js:91682-92453 placement
/**
 * 逐行读取记忆导出 NDJSON 流，带总时限与停滞检测
 */
async function* readExportStreamLines(
  source,
  maxLineLength,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  maxLines,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
) {
  let decoder = new StringDecoder("utf8");
  let pending = "";
  let lineCount = 0;
  let deadline = Date.now() + deadlineMs;
  let chunks = source.stream[Symbol.asyncIterator]();
  try {
    while (true) {
      let remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw Error("export stream exceeded its overall deadline");
      let chunk = await withTimeout(
        chunks.next(),
        Math.min(stallTimeoutMs, remainingMs),
        remainingMs < stallTimeoutMs
          ? "export stream exceeded its overall deadline"
          : "export stream stalled",
      );
      if (chunk.done) break;
      let value = chunk.value;
      pending += typeof value === "string" ? value : decoder.write(value);
      let newlineIndex;
      while (
        (newlineIndex = pending.indexOf(`
`)) >= 0
      ) {
        let sliced = pending.slice(0, newlineIndex);
        pending = pending.slice(newlineIndex + 1);
        if (maxLines !== undefined && ++lineCount > maxLines) throw new TooManyLinesError();
        if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
        if (sliced.length > maxLineLength) throw new LineTooLongError(maxLineLength);
        if (sliced !== "") yield sliced;
      }
      if (pending.length > maxLineLength) throw new LineTooLongError(maxLineLength);
    }
    pending += decoder.end();
    if (pending !== "" && pending !== "\r") {
      if (maxLines !== undefined && ++lineCount > maxLines) throw new TooManyLinesError();
      yield pending.endsWith("\r") ? pending.slice(0, -1) : pending;
    }
  } finally {
    source.destroy();
    chunks.return?.().catch(() => {
      return;
    });
  }
}
//@ chunk-7jxyna5q.js:92453-94010 placement
async function pullStoreExport({
  source,
  handleMemory,
  maxConcurrentWrites,
  maxLineLength,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
  maxLines,
}) {
  let pendingWrites = new Set();
  let writeError;
  let memoryCount = 0;
  let errorLineCount = 0;
  let completeLine = null;
  let yieldingRunner = createYieldingRunner();
  async function drainWrites() {
    await Promise.all(pendingWrites);
  }
  async function fail(reason) {
    await drainWrites();
    return {
      ok: false,
      reason,
    };
  }
  try {
    for await (let line of readExportStreamLines(
      source,
      maxLineLength,
      stallTimeoutMs,
      maxLines,
      deadlineMs,
    )) {
      if (completeLine !== null) return await fail("parse_failed");
      let raw;
      try {
        raw = jsonParseRaw(line);
      } catch {
        return await fail("parse_failed");
      }
      let typeCheck = exportLineTypeSchema().safeParse(raw);
      if (!typeCheck.success) return await fail("parse_failed");
      switch (typeCheck.data.type) {
        case "store":
          break;
        case "memory": {
          let memoryCheck = exportMemoryLineSchema().safeParse(raw);
          if (!memoryCheck.success) return await fail("parse_failed");
          memoryCount++;
          while (pendingWrites.size >= maxConcurrentWrites) await Promise.race(pendingWrites);
          if (writeError !== undefined) return await fail("write_failed");
          let record = {
            path: memoryCheck.data.path,
            content: memoryCheck.data.content,
            contentSha256: memoryCheck.data.content_sha256,
            memoryId: memoryCheck.data.id,
            updatedAt: memoryCheck.data.updated_at,
          };
          let write = handleMemory(record)
            .catch((error) => {
              writeError ??= error;
            })
            .finally(() => {
              pendingWrites.delete(write);
            });
          pendingWrites.add(write);
          break;
        }
        case "memory_error":
          errorLineCount++;
          break;
        case "complete": {
          let completeCheck = exportCompleteLineSchema().safeParse(raw);
          if (!completeCheck.success) return await fail("parse_failed");
          completeLine = {
            memoryCount: completeCheck.data.memory_count,
            errorCount: completeCheck.data.error_count ?? 0,
          };
          break;
        }
        default:
          break;
      }
      await yieldingRunner.maybeYield();
    }
  } catch (error) {
    await drainWrites();
    if (error instanceof LineTooLongError)
      return {
        ok: false,
        reason: "oversized_line",
      };
    if (error instanceof TooManyLinesError)
      return {
        ok: false,
        reason: "too_many_entries",
      };
    return {
      ok: false,
      reason: "stream_error",
    };
  }
  await drainWrites();
  if (writeError !== undefined)
    return {
      ok: false,
      reason: "write_failed",
    };
  if (completeLine === null)
    return {
      ok: false,
      reason: "stream_truncated",
    };
  if (completeLine.memoryCount !== memoryCount)
    return {
      ok: false,
      reason: "count_mismatch",
    };
  if (completeLine.errorCount > 0 || errorLineCount > 0)
    return {
      ok: false,
      reason: "decrypt_errors",
    };
  return {
    ok: true,
    memoryLines: memoryCount,
  };
}
//@ chunk-7jxyna5q.js:94010-94190 placement
var exportStoreLineSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var exportMemoryRefLineSchema;
deferInit("chunk-7jxyna5q.js:94010", () => {
  exportStoreLineSchema = DoctorLazy(() =>
    looseObject({
      type: literal("store"),
      view: stringSchema().optional(),
    }),
  );
  exportMemoryRefLineSchema = DoctorLazy(() =>
    looseObject({
      type: literal("memory"),
      id: memoryIdSchema(),
      path: stringSchema(),
      content_sha256: stringSchema(),
      content_size_bytes: numberSchema().int().nonnegative().optional(),
    }),
  );
});
//@ chunk-7jxyna5q.js:94190-95747 placement
async function pullStoreView({
  source,
  maxLineLength,
  maxEntries,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
}) {
  let entries = [];
  let sawStore = false;
  let errorLineCount = 0;
  let completeLine = null;
  let yieldingRunner = createYieldingRunner();
  try {
    for await (let line of readExportStreamLines(
      source,
      maxLineLength,
      stallTimeoutMs,
      maxEntries * 2 + 2,
      deadlineMs,
    )) {
      if (completeLine !== null)
        return {
          ok: false,
          reason: "parse_failed",
        };
      let raw;
      try {
        raw = jsonParseRaw(line);
      } catch {
        return {
          ok: false,
          reason: "parse_failed",
        };
      }
      let typeCheck = exportLineTypeSchema().safeParse(raw);
      if (!typeCheck.success)
        return {
          ok: false,
          reason: "parse_failed",
        };
      switch (typeCheck.data.type) {
        case "store": {
          if (sawStore)
            return {
              ok: false,
              reason: "parse_failed",
            };
          let storeCheck = exportStoreLineSchema().safeParse(raw);
          if (!storeCheck.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          if (storeCheck.data.view !== "basic")
            return {
              ok: false,
              reason: "view_not_honored",
            };
          sawStore = true;
          break;
        }
        case "memory": {
          if (!sawStore)
            return {
              ok: false,
              reason: "view_not_honored",
            };
          let memoryCheck = exportMemoryRefLineSchema().safeParse(raw);
          if (!memoryCheck.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          if (entries.length >= maxEntries)
            return {
              ok: false,
              reason: "too_many_entries",
            };
          entries.push({
            id: memoryCheck.data.id,
            path: memoryCheck.data.path,
            sha256: memoryCheck.data.content_sha256,
            sizeBytes: memoryCheck.data.content_size_bytes,
          });
          break;
        }
        case "memory_error":
          if (!sawStore)
            return {
              ok: false,
              reason: "view_not_honored",
            };
          errorLineCount++;
          break;
        case "complete": {
          if (!sawStore)
            return {
              ok: false,
              reason: "parse_failed",
            };
          let completeCheck = exportCompleteLineSchema().safeParse(raw);
          if (!completeCheck.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          completeLine = {
            memoryCount: completeCheck.data.memory_count,
            errorCount: completeCheck.data.error_count ?? 0,
          };
          break;
        }
        default:
          break;
      }
      await yieldingRunner.maybeYield();
    }
  } catch (error) {
    if (error instanceof LineTooLongError)
      return {
        ok: false,
        reason: "oversized_line",
      };
    if (error instanceof TooManyLinesError)
      return {
        ok: false,
        reason: "too_many_entries",
      };
    return {
      ok: false,
      reason: "stream_error",
    };
  }
  if (completeLine === null)
    return {
      ok: false,
      reason: "stream_truncated",
    };
  if (completeLine.memoryCount !== entries.length)
    return {
      ok: false,
      reason: "count_mismatch",
    };
  if (completeLine.errorCount > 0 || errorLineCount > 0)
    return {
      ok: false,
      reason: "decrypt_errors",
    };
  return {
    ok: true,
    entries,
  };
}
export { createYieldingRunner, pullStoreView, pullStoreExport };
