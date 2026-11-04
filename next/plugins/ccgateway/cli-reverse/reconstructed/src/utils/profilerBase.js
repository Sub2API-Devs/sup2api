/**
 * utils/profilerBase.ts
 *
 * 剖析基础：performance 对象、时间线格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/profilerBase.ts
 * pieces: chunk-eweqvj83.js (4)
 * attribution: affinity 1, fingerprint 2, callgraph-witnessed 1
 */
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { formatFileSize } from "./format.js";

//@ chunk-eweqvj83.js:2424-2435 affinity
var cachedPerformance = null;
//@ chunk-eweqvj83.js:2435-2496 fingerprint (2.1.88 match: getPerformance, 1)
function getPerformance() {
  if (!cachedPerformance) cachedPerformance = importMetaRequire("perf_hooks").performance;
  return cachedPerformance;
}
//@ chunk-eweqvj83.js:2496-2532 callgraph-witnessed (2.1.88 match: formatMs, 1)
function formatMs(ms) {
  return ms.toFixed(3);
}
//@ chunk-eweqvj83.js:2532-2697 fingerprint (2.1.88 match: formatTimelineLine, 1)
function formatTimelineLine(totalMs, deltaMs, name, memory, totalPad, deltaPad, extra = "") {
  let memInfo = memory
    ? ` | RSS: ${formatFileSize(memory.rss)}, Heap: ${formatFileSize(memory.heapUsed)}`
    : "";
  return `[+${formatMs(totalMs).padStart(totalPad)}ms] (+${formatMs(deltaMs).padStart(deltaPad)}ms) ${name}${extra}${memInfo}`;
}
export { getPerformance, formatTimelineLine, formatMs };
