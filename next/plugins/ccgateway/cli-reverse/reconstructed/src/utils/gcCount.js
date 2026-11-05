/**
 * utils/gcCount.ts
 *
 * 2.1.316 新增。开始统计 GC 次数，用于启动与首条消息耗时分析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tgeph7wz.js (5)
 * attribution: placement 5
 */
import { identity } from "./identity.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { countWhere } from "./collections.js";

//@ chunk-tgeph7wz.js:298-440 placement
var GC_COUNT_WINDOW_MS = 3600000;
var gcCountStateByHost = identity(
  {
    isDecided: false,
    toFirstMessage: undefined,
    toFirstResult: undefined,
    atFirstMessage: undefined,
    giveUp: undefined,
  },
  (state) => {
    takeGarbageCollectionCount();
    state.isDecided = false;
  },
);
//@ chunk-tgeph7wz.js:440-755 placement
/**
 * 开始统计 GC 次数，用于启动与首条消息耗时分析。
 */
function startGarbageCollectionCount() {
  if (gcCountStateByHost.isDecided) return;
  gcCountStateByHost.isDecided = true;
  try {
    if (
      process.env.CLAUDE_CODE_REMOTE !== "true" ||
      process.env.CLAUDE_CODE_COUNT_GARBAGE_COLLECTIONS !== "1"
    )
      return;
    let { GCProfiler } = importMetaRequire("v8");
    let toFirstMessageProfiler = new GCProfiler();
    let toFirstResultProfiler = new GCProfiler();
    toFirstMessageProfiler.start();
    toFirstResultProfiler.start();
    gcCountStateByHost.toFirstMessage = toFirstMessageProfiler;
    gcCountStateByHost.toFirstResult = toFirstResultProfiler;
    gcCountStateByHost.giveUp = setTimeout(takeGarbageCollectionCount, GC_COUNT_WINDOW_MS);
    gcCountStateByHost.giveUp.unref();
  } catch {}
}
//@ chunk-tgeph7wz.js:755-1177 placement
/**
 * 汇总 GC 统计
 */
function summarizeGcStats(profiler) {
  if (profiler === undefined) return;
  try {
    let filtered = profiler
      .stop()
      .statistics.filter((gcEntry) => gcEntry.gcType === "Scavenge" || gcEntry.gcType === "MarkSweepCompact");
    let scavengeCount = countWhere(filtered, (gcEntry) => gcEntry.gcType === "Scavenge");
    let usedHeapSize = filtered.at(-1)?.afterGC.heapStatistics.usedHeapSize;
    let stats = {
      eden: scavengeCount,
      full: filtered.length - scavengeCount,
      wall_ms: Math.round(filtered.reduce((acc, gcEntry) => acc + gcEntry.cost, 0) / 1000),
      ...(usedHeapSize !== undefined && {
        heap_after_mib: Math.round(usedHeapSize / 1048576),
      }),
    };
    return Object.values(stats).every(Number.isSafeInteger) ? stats : undefined;
  } catch {
    return;
  }
}
//@ chunk-tgeph7wz.js:1177-1255 placement
function noteFirstMessageForGarbageCollectionCount() {
  gcCountStateByHost.atFirstMessage ??= summarizeGcStats(gcCountStateByHost.toFirstMessage);
  gcCountStateByHost.toFirstMessage = undefined;
}
//@ chunk-tgeph7wz.js:1255-1506 placement
function takeGarbageCollectionCount() {
  let { atFirstMessage } = gcCountStateByHost;
  clearTimeout(gcCountStateByHost.giveUp);
  summarizeGcStats(gcCountStateByHost.toFirstMessage);
  let toFirstResult = summarizeGcStats(gcCountStateByHost.toFirstResult);
  gcCountStateByHost.toFirstMessage = undefined;
  gcCountStateByHost.toFirstResult = undefined;
  gcCountStateByHost.atFirstMessage = undefined;
  gcCountStateByHost.giveUp = undefined;
  return (
    toFirstResult && {
      ...(atFirstMessage && {
        to_first_message: atFirstMessage,
      }),
      to_first_result: toFirstResult,
    }
  );
}
export { takeGarbageCollectionCount, noteFirstMessageForGarbageCollectionCount, startGarbageCollectionCount };
