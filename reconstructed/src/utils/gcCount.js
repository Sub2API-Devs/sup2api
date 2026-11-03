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
import { identity } from "./identity.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { count } from "./collections.js";

//@ chunk-hh66v1ps.js:298-440 placement
var GC_COUNT_WINDOW_MS = 3600000;
var gcCountStateByHost = identity(
  {
    isDecided: false,
    toFirstMessage: undefined,
    toFirstResult: undefined,
    atFirstMessage: undefined,
    giveUp: undefined,
  },
  (t) => {
    takeGarbageCollectionCount();
    t.isDecided = false;
  },
);
//@ chunk-hh66v1ps.js:440-755 placement
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
    let s = new GCProfiler();
    let i = new GCProfiler();
    s.start();
    i.start();
    gcCountStateByHost.toFirstMessage = s;
    gcCountStateByHost.toFirstResult = i;
    gcCountStateByHost.giveUp = setTimeout(takeGarbageCollectionCount, GC_COUNT_WINDOW_MS);
    gcCountStateByHost.giveUp.unref();
  } catch {}
}
//@ chunk-hh66v1ps.js:755-1177 placement
/**
 * 汇总 GC 统计
 */
function summarizeGcStats(t) {
  if (t === undefined) return;
  try {
    let filtered = t
      .stop()
      .statistics.filter((n) => n.gcType === "Scavenge" || n.gcType === "MarkSweepCompact");
    let i = count(filtered, (n) => n.gcType === "Scavenge");
    let usedHeapSize = filtered.at(-1)?.afterGC.heapStatistics.usedHeapSize;
    let a = {
      eden: i,
      full: filtered.length - i,
      wall_ms: Math.round(filtered.reduce((acc, u) => acc + u.cost, 0) / 1000),
      ...(usedHeapSize !== undefined && {
        heap_after_mib: Math.round(usedHeapSize / 1048576),
      }),
    };
    return Object.values(a).every(Number.isSafeInteger) ? a : undefined;
  } catch {
    return;
  }
}
//@ chunk-hh66v1ps.js:1177-1255 placement
function noteFirstMessageForGarbageCollectionCount() {
  gcCountStateByHost.atFirstMessage ??= summarizeGcStats(gcCountStateByHost.toFirstMessage);
  gcCountStateByHost.toFirstMessage = undefined;
}
//@ chunk-hh66v1ps.js:1255-1506 placement
function takeGarbageCollectionCount() {
  let { atFirstMessage } = gcCountStateByHost;
  clearTimeout(gcCountStateByHost.giveUp);
  summarizeGcStats(gcCountStateByHost.toFirstMessage);
  let s = summarizeGcStats(gcCountStateByHost.toFirstResult);
  gcCountStateByHost.toFirstMessage = undefined;
  gcCountStateByHost.toFirstResult = undefined;
  gcCountStateByHost.atFirstMessage = undefined;
  gcCountStateByHost.giveUp = undefined;
  return (
    s && {
      ...(atFirstMessage && {
        to_first_message: atFirstMessage,
      }),
      to_first_result: s,
    }
  );
}
export { takeGarbageCollectionCount, noteFirstMessageForGarbageCollectionCount };
