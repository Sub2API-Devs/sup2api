/**
 * commands/heapdump/heapdump.ts
 *
 * /heapdump 实现：写 JS 堆快照到桌面或家目录并报告内存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/heapdump/heapdump.ts
 * pieces: chunk-dhgx9s0b.js (3)
 * attribution: fingerprint 1, affinity 2
 */
import { basename } from "path";
import { performHeapDump } from "../../utils/heapDumpService.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-dhgx9s0b.js:2263-2840 fingerprint = call (0.478)
/**
 * /heapdump 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(args, context) {
  let result = await performHeapDump();
  let a = isBridgeOrTransport(context.session);
  if (!result.success) {
    if (a) {
      logForDebugging(`heapdump failed: ${result.error}`, {
        level: "error",
      });
      return {
        type: "text",
        value: "Failed to create heap dump (detail withheld on this connection)",
      };
    }
    return {
      type: "text",
      value: `Failed to create heap dump: ${result.error}`,
    };
  }
  let i = a ? basename(result.heapPath) : result.heapPath;
  let p = a ? basename(result.diagPath) : result.diagPath;
  if (a) logForDebugging(`heapdump written: ${result.heapPath} ${result.diagPath}`);
  let h = [i, p, "", formatHeapReport(result.diagnostics)];
  h.push("", "Open the .heapsnapshot in Chrome DevTools \u2192 Memory \u2192 Load to inspect retainers.");
  return {
    type: "text",
    value: h.join(`
`),
  };
}
//@ chunk-dhgx9s0b.js:2840-3908 affinity
function formatHeapReport(diagnostics) {
  let { memoryUsage, resourceUsage, analysis } = diagnostics;
  let i = analysis.potentialLeaks.length
    ? analysis.potentialLeaks.map((potentialLeak) => `  \u26A0 ${potentialLeak}`).join(`
`)
    : "  (no obvious leak indicators)";
  let p = (n, u) =>
    `RSS ${formatGigabytes(memoryUsage.rss)} (peak ${formatGigabytes(resourceUsage.maxRSS)}) ${n > u ? "\u2014 most memory is JS heap (inspect the .heapsnapshot)" : "\u2014 most memory is native (NOT in the .heapsnapshot)"}`;
  if (diagnostics.runtime === "bun") {
    let max = Math.max(0, memoryUsage.rss - memoryUsage.heapUsed);
    return [
      p(memoryUsage.heapUsed, max),
      `  JS heap          ${formatGigabytes(memoryUsage.heapUsed).padStart(8)}  in snapshot`,
      `  strings, buffers ${formatGigabytes(memoryUsage.external).padStart(8)}  part of the JS heap, in snapshot`,
      `  outside the heap ${formatGigabytes(max).padStart(8)}  not in snapshot (code/JIT/stacks/allocator)`,
      i,
    ].join(`
`);
  }
  let h = memoryUsage.external - memoryUsage.arrayBuffers;
  let max = Math.max(0, memoryUsage.rss - memoryUsage.heapTotal - memoryUsage.external);
  return [
    p(memoryUsage.heapTotal, memoryUsage.external + max),
    `  JS heap        ${formatGigabytes(memoryUsage.heapTotal).padStart(8)}  in snapshot`,
    `  array buffers  ${formatGigabytes(memoryUsage.arrayBuffers).padStart(8)}  not in snapshot`,
    `  other external ${formatGigabytes(h).padStart(8)}  not in snapshot`,
    `  unaccounted    ${formatGigabytes(max).padStart(8)}  not in snapshot (code/JIT/stacks/allocator)`,
    i,
  ].join(`
`);
}
//@ chunk-dhgx9s0b.js:3908-3962 affinity
function formatGigabytes(r) {
  return `${(r / 1073741824).toFixed(2)} GB`;
}
