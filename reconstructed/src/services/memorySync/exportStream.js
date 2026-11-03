/**
 * services/memorySync/exportStream.ts
 *
 * 记忆库导出流读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { StringDecoder } from "string_decoder";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, string, literal, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { memoryIdSchema } from "../orgMemory/storeErrors.js";
import { withTimeout } from "../../utils/sleep.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";

//@ chunk-s61vbvea.js:91861-91872 placement
/**
 * 执行器定期让出事件循环的时间预算（200 毫秒）。
 */
var DEFAULT_YIELD_BUDGET_MS = 200;
//@ chunk-s61vbvea.js:91872-92370 placement
/**
 * 创建并发受限且定期让出事件循环的执行器：runBounded 限制并发数，maybeYield 超过时间预算时让出。
 */
function createYieldingRunner(e = {}) {
  let yieldBudgetMs = e.yieldBudgetMs ?? DEFAULT_YIELD_BUDGET_MS;
  let maxConcurrent = e.maxConcurrent;
  let startTime = performance.now();
  async function h() {
    if (performance.now() - startTime <= yieldBudgetMs) return;
    await yieldToEventLoop();
    startTime = performance.now();
  }
  let y = 0;
  let S = [];
  let w = 0;
  function R() {
    if (maxConcurrent === undefined || y < maxConcurrent) {
      y++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      S.push(() => {
        y++;
        resolve();
      });
    });
  }
  function x() {
    y--;
    if (w >= S.length) return;
    let j = S[w];
    w++;
    if (w === S.length) {
      S.length = 0;
      w = 0;
    }
    j();
  }
  async function P(j) {
    await R();
    let G;
    try {
      G = await j();
    } finally {
      x();
    }
    await h();
    return G;
  }
  return {
    maybeYield: h,
    runBounded: P,
  };
}
//@ chunk-s61vbvea.js:92370-92634 placement
var EXPORT_IDLE_TIMEOUT_MS = 60000;
var EXPORT_TOTAL_TIMEOUT_MS = 300000;
var exportLineTypeSchema = DoctorLazy(() =>
  looseObject({
    type: string(),
  }),
);
var exportMemoryLineSchema = DoctorLazy(() =>
  looseObject({
    type: literal("memory"),
    id: memoryIdSchema(),
    path: string(),
    content: string(),
    content_sha256: string(),
    updated_at: string(),
  }),
);
var exportCompleteLineSchema = DoctorLazy(() =>
  looseObject({
    type: literal("complete"),
    memory_count: E().int().nonnegative(),
    error_count: E().int().nonnegative().optional(),
  }),
);
//@ chunk-s61vbvea.js:92634-92742 placement
class LineTooLongError extends Error {
  constructor(e) {
    super(`NDJSON line exceeds ${e} bytes`);
    this.name = "LineTooLongError";
  }
}
//@ chunk-s61vbvea.js:92742-92858 placement
class TooManyLinesError extends Error {
  constructor() {
    super("NDJSON stream exceeded its line budget");
    this.name = "TooManyLinesError";
  }
}
//@ chunk-s61vbvea.js:92858-93629 placement
/**
 * 逐行读取记忆导出 NDJSON 流，带总时限与停滞检测
 */
async function* readExportStreamLines(
  source,
  maxLineLength,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  s,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
) {
  let y = new StringDecoder("utf8");
  let S = "";
  let w = 0;
  let R = Date.now() + deadlineMs;
  let x = source.stream[Symbol.asyncIterator]();
  try {
    while (true) {
      let P = R - Date.now();
      if (P <= 0) throw Error("export stream exceeded its overall deadline");
      let j = await withTimeout(
        x.next(),
        Math.min(stallTimeoutMs, P),
        P < stallTimeoutMs ? "export stream exceeded its overall deadline" : "export stream stalled",
      );
      if (j.done) break;
      let G = j.value;
      S += typeof G === "string" ? G : y.write(G);
      let L;
      while (
        (L = S.indexOf(`
`)) >= 0
      ) {
        let sliced = S.slice(0, L);
        S = S.slice(L + 1);
        if (s !== undefined && ++w > s) throw new TooManyLinesError();
        if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
        if (sliced.length > maxLineLength) throw new LineTooLongError(maxLineLength);
        if (sliced !== "") yield sliced;
      }
      if (S.length > maxLineLength) throw new LineTooLongError(maxLineLength);
    }
    S += y.end();
    if (S !== "" && S !== "\r") {
      if (s !== undefined && ++w > s) throw new TooManyLinesError();
      yield S.endsWith("\r") ? S.slice(0, -1) : S;
    }
  } finally {
    source.destroy();
    x.return?.().catch(() => {
      return;
    });
  }
}
//@ chunk-s61vbvea.js:93629-95181 placement
async function pullStoreExport({
  source,
  handleMemory,
  maxConcurrentWrites,
  maxLineLength,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
  maxLines,
}) {
  let w = new Set();
  let R;
  let x = 0;
  let P = 0;
  let j = null;
  let yieldingRunner = createYieldingRunner();
  async function L() {
    await Promise.all(w);
  }
  async function q(reason) {
    await L();
    return {
      ok: false,
      reason,
    };
  }
  try {
    for await (let Q of readExportStreamLines(source, maxLineLength, stallTimeoutMs, maxLines, deadlineMs)) {
      if (j !== null) return await q("parse_failed");
      let Z;
      try {
        Z = jsonParseRaw(Q);
      } catch {
        return await q("parse_failed");
      }
      let ee = exportLineTypeSchema().safeParse(Z);
      if (!ee.success) return await q("parse_failed");
      switch (ee.data.type) {
        case "store":
          break;
        case "memory": {
          let ae = exportMemoryLineSchema().safeParse(Z);
          if (!ae.success) return await q("parse_failed");
          x++;
          while (w.size >= maxConcurrentWrites) await Promise.race(w);
          if (R !== undefined) return await q("write_failed");
          let se = {
            path: ae.data.path,
            content: ae.data.content,
            contentSha256: ae.data.content_sha256,
            memoryId: ae.data.id,
            updatedAt: ae.data.updated_at,
          };
          let re = handleMemory(se)
            .catch((error) => {
              R ??= error;
            })
            .finally(() => {
              w.delete(re);
            });
          w.add(re);
          break;
        }
        case "memory_error":
          P++;
          break;
        case "complete": {
          let ae = exportCompleteLineSchema().safeParse(Z);
          if (!ae.success) return await q("parse_failed");
          j = {
            memoryCount: ae.data.memory_count,
            errorCount: ae.data.error_count ?? 0,
          };
          break;
        }
        default:
          break;
      }
      await yieldingRunner.maybeYield();
    }
  } catch (error) {
    await L();
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
  await L();
  if (R !== undefined)
    return {
      ok: false,
      reason: "write_failed",
    };
  if (j === null)
    return {
      ok: false,
      reason: "stream_truncated",
    };
  if (j.memoryCount !== x)
    return {
      ok: false,
      reason: "count_mismatch",
    };
  if (j.errorCount > 0 || P > 0)
    return {
      ok: false,
      reason: "decrypt_errors",
    };
  return {
    ok: true,
    memoryLines: x,
  };
}
//@ chunk-s61vbvea.js:95181-95361 placement
var exportStoreLineSchema = DoctorLazy(() =>
  looseObject({
    type: literal("store"),
    view: string().optional(),
  }),
);
var exportMemoryRefLineSchema = DoctorLazy(() =>
  looseObject({
    type: literal("memory"),
    id: memoryIdSchema(),
    path: string(),
    content_sha256: string(),
    content_size_bytes: E().int().nonnegative().optional(),
  }),
);
//@ chunk-s61vbvea.js:95361-96918 placement
async function pullStoreView({
  source,
  maxLineLength,
  maxEntries,
  stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
}) {
  let y = [];
  let S = false;
  let w = 0;
  let R = null;
  let yieldingRunner = createYieldingRunner();
  try {
    for await (let P of readExportStreamLines(
      source,
      maxLineLength,
      stallTimeoutMs,
      maxEntries * 2 + 2,
      deadlineMs,
    )) {
      if (R !== null)
        return {
          ok: false,
          reason: "parse_failed",
        };
      let j;
      try {
        j = jsonParseRaw(P);
      } catch {
        return {
          ok: false,
          reason: "parse_failed",
        };
      }
      let G = exportLineTypeSchema().safeParse(j);
      if (!G.success)
        return {
          ok: false,
          reason: "parse_failed",
        };
      switch (G.data.type) {
        case "store": {
          if (S)
            return {
              ok: false,
              reason: "parse_failed",
            };
          let L = exportStoreLineSchema().safeParse(j);
          if (!L.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          if (L.data.view !== "basic")
            return {
              ok: false,
              reason: "view_not_honored",
            };
          S = true;
          break;
        }
        case "memory": {
          if (!S)
            return {
              ok: false,
              reason: "view_not_honored",
            };
          let L = exportMemoryRefLineSchema().safeParse(j);
          if (!L.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          if (y.length >= maxEntries)
            return {
              ok: false,
              reason: "too_many_entries",
            };
          y.push({
            id: L.data.id,
            path: L.data.path,
            sha256: L.data.content_sha256,
            sizeBytes: L.data.content_size_bytes,
          });
          break;
        }
        case "memory_error":
          if (!S)
            return {
              ok: false,
              reason: "view_not_honored",
            };
          w++;
          break;
        case "complete": {
          if (!S)
            return {
              ok: false,
              reason: "parse_failed",
            };
          let L = exportCompleteLineSchema().safeParse(j);
          if (!L.success)
            return {
              ok: false,
              reason: "parse_failed",
            };
          R = {
            memoryCount: L.data.memory_count,
            errorCount: L.data.error_count ?? 0,
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
  if (R === null)
    return {
      ok: false,
      reason: "stream_truncated",
    };
  if (R.memoryCount !== y.length)
    return {
      ok: false,
      reason: "count_mismatch",
    };
  if (R.errorCount > 0 || w > 0)
    return {
      ok: false,
      reason: "decrypt_errors",
    };
  return {
    ok: true,
    entries: y,
  };
}
export { createYieldingRunner, pullStoreView, pullStoreExport };
