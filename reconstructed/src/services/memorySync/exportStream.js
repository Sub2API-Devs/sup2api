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
import { kt, o, T, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { WEn } from "../orgMemory/storeErrors.js";
import { withTimeout } from "../../utils/sleep.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";

//@ chunk-s61vbvea.js:91861-91872 placement
var Rv = 200;
/**
 * 创建并发受限且定期让出事件循环的执行器：runBounded 限制并发数，maybeYield 超过时间预算时让出。
 */
//@ chunk-s61vbvea.js:91872-92370 placement
function createYieldingRunner(e = {}) {
  let n = e.yieldBudgetMs ?? Rv,
    maxConcurrent = e.maxConcurrent,
    startTime = performance.now();
  async function h() {
    if (performance.now() - startTime <= n) return;
    (await yieldToEventLoop(), (startTime = performance.now()));
  }
  let y = 0,
    S = [],
    w = 0;
  function R() {
    if (maxConcurrent === void 0 || y < maxConcurrent) return (y++, Promise.resolve());
    return new Promise((j) => {
      S.push(() => {
        (y++, j());
      });
    });
  }
  function x() {
    if ((y--, w >= S.length)) return;
    let j = S[w];
    if ((w++, w === S.length)) ((S.length = 0), (w = 0));
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
    return (await h(), G);
  }
  return { maybeYield: h, runBounded: P };
}
//@ chunk-s61vbvea.js:92370-92634 placement
var EXPORT_IDLE_TIMEOUT_MS = 60000,
  EXPORT_TOTAL_TIMEOUT_MS = 300000,
  exportLineTypeSchema = DoctorLazy(() => kt({ type: o() })),
  exportMemoryLineSchema = DoctorLazy(() =>
    kt({ type: T("memory"), id: WEn(), path: o(), content: o(), content_sha256: o(), updated_at: o() }),
  ),
  exportCompleteLineSchema = DoctorLazy(() =>
    kt({
      type: T("complete"),
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
/**
 * 逐行读取记忆导出 NDJSON 流，带总时限与停滞检测
 */
//@ chunk-s61vbvea.js:92858-93629 placement
async function* readExportStreamLines(e, n, r = EXPORT_IDLE_TIMEOUT_MS, s, h = EXPORT_TOTAL_TIMEOUT_MS) {
  let y = new StringDecoder("utf8"),
    S = "",
    w = 0,
    R = Date.now() + h,
    x = e.stream[Symbol.asyncIterator]();
  try {
    while (!0) {
      let P = R - Date.now();
      if (P <= 0) throw Error("export stream exceeded its overall deadline");
      let j = await withTimeout(
        x.next(),
        Math.min(r, P),
        P < r ? "export stream exceeded its overall deadline" : "export stream stalled",
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
        if (((S = S.slice(L + 1)), s !== void 0 && ++w > s)) throw new TooManyLinesError();
        if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
        if (sliced.length > n) throw new LineTooLongError(n);
        if (sliced !== "") yield sliced;
      }
      if (S.length > n) throw new LineTooLongError(n);
    }
    if (((S += y.end()), S !== "" && S !== "\r")) {
      if (s !== void 0 && ++w > s) throw new TooManyLinesError();
      yield S.endsWith("\r") ? S.slice(0, -1) : S;
    }
  } finally {
    (e.destroy(),
      x.return?.().catch(() => {
        return;
      }));
  }
}
//@ chunk-s61vbvea.js:93629-95181 placement
async function pullStoreExport({
  source: source,
  handleMemory: handleMemory,
  maxConcurrentWrites: maxConcurrentWrites,
  maxLineLength: maxLineLength,
  stallTimeoutMs: stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs: deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
  maxLines: maxLines,
}) {
  let w = new Set(),
    R,
    x = 0,
    P = 0,
    j = null,
    G = createYieldingRunner();
  async function L() {
    await Promise.all(w);
  }
  async function q(Q) {
    return (await L(), { ok: !1, reason: Q });
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
      let safeParse = exportLineTypeSchema().safeParse(Z);
      if (!safeParse.success) return await q("parse_failed");
      switch (safeParse.data.type) {
        case "store":
          break;
        case "memory": {
          let safeParse = exportMemoryLineSchema().safeParse(Z);
          if (!safeParse.success) return await q("parse_failed");
          x++;
          while (w.size >= maxConcurrentWrites) await Promise.race(w);
          if (R !== void 0) return await q("write_failed");
          let se = {
              path: safeParse.data.path,
              content: safeParse.data.content,
              contentSha256: safeParse.data.content_sha256,
              memoryId: safeParse.data.id,
              updatedAt: safeParse.data.updated_at,
            },
            re = handleMemory(se)
              .catch((he) => {
                R ??= he;
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
          let safeParse = exportCompleteLineSchema().safeParse(Z);
          if (!safeParse.success) return await q("parse_failed");
          j = { memoryCount: safeParse.data.memory_count, errorCount: safeParse.data.error_count ?? 0 };
          break;
        }
        default:
          break;
      }
      await G.maybeYield();
    }
  } catch (error) {
    if ((await L(), error instanceof LineTooLongError)) return { ok: !1, reason: "oversized_line" };
    if (error instanceof TooManyLinesError) return { ok: !1, reason: "too_many_entries" };
    return { ok: !1, reason: "stream_error" };
  }
  if ((await L(), R !== void 0)) return { ok: !1, reason: "write_failed" };
  if (j === null) return { ok: !1, reason: "stream_truncated" };
  if (j.memoryCount !== x) return { ok: !1, reason: "count_mismatch" };
  if (j.errorCount > 0 || P > 0) return { ok: !1, reason: "decrypt_errors" };
  return { ok: !0, memoryLines: x };
}
//@ chunk-s61vbvea.js:95181-95361 placement
var exportStoreLineSchema = DoctorLazy(() => kt({ type: T("store"), view: o().optional() })),
  exportMemoryRefLineSchema = DoctorLazy(() =>
    kt({
      type: T("memory"),
      id: WEn(),
      path: o(),
      content_sha256: o(),
      content_size_bytes: E().int().nonnegative().optional(),
    }),
  );
//@ chunk-s61vbvea.js:95361-96918 placement
async function pullStoreView({
  source: source,
  maxLineLength: maxLineLength,
  maxEntries: maxEntries,
  stallTimeoutMs: stallTimeoutMs = EXPORT_IDLE_TIMEOUT_MS,
  deadlineMs: deadlineMs = EXPORT_TOTAL_TIMEOUT_MS,
}) {
  let y = [],
    S = !1,
    w = 0,
    R = null,
    x = createYieldingRunner();
  try {
    for await (let P of readExportStreamLines(
      source,
      maxLineLength,
      stallTimeoutMs,
      maxEntries * 2 + 2,
      deadlineMs,
    )) {
      if (R !== null) return { ok: !1, reason: "parse_failed" };
      let j;
      try {
        j = jsonParseRaw(P);
      } catch {
        return { ok: !1, reason: "parse_failed" };
      }
      let safeParse = exportLineTypeSchema().safeParse(j);
      if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
      switch (safeParse.data.type) {
        case "store": {
          if (S) return { ok: !1, reason: "parse_failed" };
          let safeParse = exportStoreLineSchema().safeParse(j);
          if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
          if (safeParse.data.view !== "basic") return { ok: !1, reason: "view_not_honored" };
          S = !0;
          break;
        }
        case "memory": {
          if (!S) return { ok: !1, reason: "view_not_honored" };
          let safeParse = exportMemoryRefLineSchema().safeParse(j);
          if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
          if (y.length >= maxEntries) return { ok: !1, reason: "too_many_entries" };
          y.push({
            id: safeParse.data.id,
            path: safeParse.data.path,
            sha256: safeParse.data.content_sha256,
            sizeBytes: safeParse.data.content_size_bytes,
          });
          break;
        }
        case "memory_error":
          if (!S) return { ok: !1, reason: "view_not_honored" };
          w++;
          break;
        case "complete": {
          if (!S) return { ok: !1, reason: "parse_failed" };
          let safeParse = exportCompleteLineSchema().safeParse(j);
          if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
          R = { memoryCount: safeParse.data.memory_count, errorCount: safeParse.data.error_count ?? 0 };
          break;
        }
        default:
          break;
      }
      await x.maybeYield();
    }
  } catch (error) {
    if (error instanceof LineTooLongError) return { ok: !1, reason: "oversized_line" };
    if (error instanceof TooManyLinesError) return { ok: !1, reason: "too_many_entries" };
    return { ok: !1, reason: "stream_error" };
  }
  if (R === null) return { ok: !1, reason: "stream_truncated" };
  if (R.memoryCount !== y.length) return { ok: !1, reason: "count_mismatch" };
  if (R.errorCount > 0 || w > 0) return { ok: !1, reason: "decrypt_errors" };
  return { ok: !0, entries: y };
}

export { createYieldingRunner, pullStoreView, pullStoreExport };
