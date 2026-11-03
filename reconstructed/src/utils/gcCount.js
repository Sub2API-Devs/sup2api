/**
 * utils/gcCount.ts
 *
 * 2.1.316 新增。开始统计 GC 次数，用于启动与首条消息耗时分析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hh66v1ps.js (5)
 * attribution: placement 5
 */
import { ge } from "./identity.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { count } from "./collections.js";

//@ chunk-hh66v1ps.js:298-440 placement
var GC_COUNT_WINDOW_MS = 3600000,
  gcCountStateByHost = ge(
    { isDecided: !1, toFirstMessage: void 0, toFirstResult: void 0, atFirstMessage: void 0, giveUp: void 0 },
    (t) => {
      (takeGarbageCollectionCount(), (t.isDecided = !1));
    },
  );
/**
 * 开始统计 GC 次数，用于启动与首条消息耗时分析。
 */
//@ chunk-hh66v1ps.js:440-755 placement
function startGarbageCollectionCount() {
  if (gcCountStateByHost.isDecided) return;
  gcCountStateByHost.isDecided = !0;
  try {
    if (
      process.env.CLAUDE_CODE_REMOTE !== "true" ||
      process.env.CLAUDE_CODE_COUNT_GARBAGE_COLLECTIONS !== "1"
    )
      return;
    let { GCProfiler: GCProfiler } = importMetaRequire("v8"),
      s = new GCProfiler(),
      i = new GCProfiler();
    (s.start(),
      i.start(),
      (gcCountStateByHost.toFirstMessage = s),
      (gcCountStateByHost.toFirstResult = i),
      (gcCountStateByHost.giveUp = setTimeout(takeGarbageCollectionCount, GC_COUNT_WINDOW_MS)),
      gcCountStateByHost.giveUp.unref());
  } catch {}
}
/**
 * 汇总 GC 统计
 */
//@ chunk-hh66v1ps.js:755-1177 placement
function summarizeGcStats(t) {
  if (t === void 0) return;
  try {
    let filtered = t
        .stop()
        .statistics.filter(
          (statistic) => statistic.gcType === "Scavenge" || statistic.gcType === "MarkSweepCompact",
        ),
      i = count(filtered, (n) => n.gcType === "Scavenge"),
      r = filtered.at(-1)?.afterGC.heapStatistics.usedHeapSize,
      a = {
        eden: i,
        full: filtered.length - i,
        wall_ms: Math.round(filtered.reduce((n, u) => n + u.cost, 0) / 1000),
        ...(r !== void 0 && { heap_after_mib: Math.round(r / 1048576) }),
      };
    return Object.values(a).every(Number.isSafeInteger) ? a : void 0;
  } catch {
    return;
  }
}
//@ chunk-hh66v1ps.js:1177-1255 placement
function noteFirstMessageForGarbageCollectionCount() {
  ((gcCountStateByHost.atFirstMessage ??= summarizeGcStats(gcCountStateByHost.toFirstMessage)),
    (gcCountStateByHost.toFirstMessage = void 0));
}
//@ chunk-hh66v1ps.js:1255-1506 placement
function takeGarbageCollectionCount() {
  let { atFirstMessage: atFirstMessage } = gcCountStateByHost;
  (clearTimeout(gcCountStateByHost.giveUp), summarizeGcStats(gcCountStateByHost.toFirstMessage));
  let s = summarizeGcStats(gcCountStateByHost.toFirstResult);
  return (
    (gcCountStateByHost.toFirstMessage = void 0),
    (gcCountStateByHost.toFirstResult = void 0),
    (gcCountStateByHost.atFirstMessage = void 0),
    (gcCountStateByHost.giveUp = void 0),
    s && { ...(atFirstMessage && { to_first_message: atFirstMessage }), to_first_result: s }
  );
}

export { takeGarbageCollectionCount, noteFirstMessageForGarbageCollectionCount };
