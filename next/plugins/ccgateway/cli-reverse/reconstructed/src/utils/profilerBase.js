/**
 * utils/profilerBase.ts
 *
 * 剖析基础：performance 对象、时间线格式化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/profilerBase.ts
 * pieces: chunk-948bfvqt.js (4)
 * attribution: affinity 1, fingerprint 2, callgraph-witnessed 1
 */
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { formatFileSize } from "./format.js";

//@ chunk-948bfvqt.js:1946-1957 affinity
var cachedPerformance = null;
//@ chunk-948bfvqt.js:1957-2018 fingerprint (2.1.88 match: getPerformance, 1)
function getPerformance() {
  if (!cachedPerformance) cachedPerformance = importMetaRequire("perf_hooks").performance;
  return cachedPerformance;
}
//@ chunk-948bfvqt.js:2018-2054 callgraph-witnessed (2.1.88 match: formatMs, 1)
function formatMs(ms) {
  return ms.toFixed(3);
}
//@ chunk-948bfvqt.js:2054-2219 fingerprint (2.1.88 match: formatTimelineLine, 1)
function formatTimelineLine(totalMs, deltaMs, name, memory, totalPad, deltaPad, extra = "") {
  let memInfo = memory
    ? ` | RSS: ${formatFileSize(memory.rss)}, Heap: ${formatFileSize(memory.heapUsed)}`
    : "";
  return `[+${formatMs(totalMs).padStart(totalPad)}ms] (+${formatMs(deltaMs).padStart(deltaPad)}ms) ${name}${extra}${memInfo}`;
}
export { getPerformance, formatTimelineLine, formatMs };
