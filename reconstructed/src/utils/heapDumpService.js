/**
 * utils/heapDumpService.ts
 *
 * 堆快照与内存诊断（/proc smaps、fd 数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/heapDumpService.ts
 * pieces: chunk-0ffn6ajs.js (3)
 * attribution: fingerprint 2, facade-exports 1
 */
import { getHeapStatistics, getHeapSpaceStatistics } from "v8";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { writeFileSync } from "fs";
import { getSessionId } from "../bootstrap/state.js";
import { alwaysTrue, jsonStringify } from "./slowOperations.js";
import { getPlatform } from "./platform.js";
import { mayHaveLauncherHostLoginInMemory } from "./auth/launcherHostLogin.js";
import { logForDebugging } from "./debug.js";
import { getDesktopPath } from "./file.js";
import { getFsImplementation } from "./fsOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { toError, isSyscallError } from "./errors.js";
import { logError } from "./log.js";

/**
 * 采集内存诊断：/proc/self/smaps_rollup、fd 数、堆统计。
 */
//@ chunk-0ffn6ajs.js:683-3241 fingerprint = captureMemoryDiagnostics (0.836)
async function captureMemoryDiagnostics(trigger, dumpNumber = 0) {
  let usage = process.memoryUsage(),
    heapStats = getHeapStatistics(),
    resourceUsage = process.resourceUsage(),
    uptimeSeconds = process.uptime(),
    d;
  try {
    d = getHeapSpaceStatistics();
  } catch {}
  let activeHandles = process._getActiveHandles().length,
    activeRequests = process._getActiveRequests().length,
    r;
  try {
    r = (await readdir("/proc/self/fd")).length;
  } catch {}
  let c;
  try {
    c = await readFile("/proc/self/smaps_rollup", "utf8");
  } catch {}
  let f, S, v;
  try {
    let { heapStats: heapStats } = await import("bun:jsc"),
      b = heapStats(!0);
    ((f = b.objectTypeCounts), (S = b.protectedObjectTypeCounts), (v = b.mimalloc || void 0));
  } catch {}
  let x = usage.rss - usage.heapUsed,
    bytesPerSecond = uptimeSeconds > 0 ? usage.rss / uptimeSeconds : 0,
    y = (bytesPerSecond * 3600) / 1048576,
    potentialLeaks = [];
  if (heapStats.number_of_detached_contexts > 0)
    potentialLeaks.push(
      `${heapStats.number_of_detached_contexts} detached context(s) - possible iframe/context leak`,
    );
  if (activeHandles > 100)
    potentialLeaks.push(`${activeHandles} active handles - possible timer/socket leak`);
  if (x > usage.heapUsed)
    potentialLeaks.push("Native memory > heap - leak may be in native addons (node-pty, etc.)");
  if (y > 100) potentialLeaks.push(`High memory growth rate: ${y.toFixed(1)} MB/hour`);
  if (r && r > 500) potentialLeaks.push(`${r} open file descriptors - possible file/socket leak`);
  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    trigger: trigger,
    dumpNumber: dumpNumber,
    uptimeSeconds: uptimeSeconds,
    runtime: alwaysTrue() ? "bun" : "node",
    memoryUsage: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
    },
    memoryGrowthRate: { bytesPerSecond: bytesPerSecond, mbPerHour: y },
    v8HeapStats: {
      heapSizeLimit: heapStats.heap_size_limit,
      mallocedMemory: heapStats.malloced_memory,
      peakMallocedMemory: heapStats.peak_malloced_memory,
      detachedContexts: heapStats.number_of_detached_contexts,
      nativeContexts: heapStats.number_of_native_contexts,
    },
    v8HeapSpaces: d?.map((space) => ({
      name: space.space_name,
      size: space.space_size,
      used: space.space_used_size,
      available: space.space_available_size,
    })),
    resourceUsage: {
      maxRSS: resourceUsage.maxRSS * (getPlatform() === "macos" ? 1 : 1024),
      userCPUTime: resourceUsage.userCPUTime,
      systemCPUTime: resourceUsage.systemCPUTime,
    },
    activeHandles: activeHandles,
    activeRequests: activeRequests,
    openFileDescriptors: r,
    analysis: {
      potentialLeaks: potentialLeaks,
      recommendation:
        potentialLeaks.length > 0
          ? `WARNING: ${potentialLeaks.length} potential leak indicator(s) found. See potentialLeaks array.`
          : "No obvious leak indicators. Check heap snapshot for retained objects.",
    },
    smapsRollup: c,
    objectTypeCounts: f,
    protectedObjectTypeCounts: S,
    mimalloc: v,
    platform: "linux",
    nodeVersion: process.version,
    ccVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
/**
 * 写堆快照与内存诊断（/heapdump 或内存超限触发）。
 */
//@ chunk-0ffn6ajs.js:3241-4354 facade-exports = performHeapDump (0.807)
async function performHeapDump(trigger = "manual", dumpNumber = 0) {
  if (mayHaveLauncherHostLoginInMemory())
    return { success: !1, error: "heap dumps are unavailable in a launcher-started session" };
  try {
    let sessionId = getSessionId(),
      diagnostics = await captureMemoryDiagnostics(trigger, dumpNumber),
      toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(3);
    logForDebugging(`[HeapDump] Memory state:
  heapUsed: ${toGB(diagnostics.memoryUsage.heapUsed)} GB (in snapshot)
  external: ${toGB(diagnostics.memoryUsage.external)} GB (${diagnostics.runtime === "bun" ? "part of heapUsed, in snapshot" : "NOT in snapshot"})
  rss: ${toGB(diagnostics.memoryUsage.rss)} GB (total process)
  ${diagnostics.analysis.recommendation}`);
    let m = await getDesktopPath();
    await getFsImplementation().mkdir(m);
    let suffix = dumpNumber > 0 ? `-dump${dumpNumber}` : "",
      heapFilename = `${sessionId}${suffix}.heapsnapshot`,
      diagFilename = `${sessionId}${suffix}-diagnostics.json`,
      heapPath = join(m, heapFilename),
      diagPath = join(m, diagFilename);
    return (
      await writeFile(diagPath, jsonStringify(diagnostics, null, 2), { mode: 384 }),
      logForDebugging(`[HeapDump] Diagnostics written to ${diagPath}`),
      await writeHeapSnapshot(heapPath),
      logForDebugging(`[HeapDump] Heap dump written to ${heapPath}`),
      logEvent("tengu_heap_dump", {
        triggerManual: !0,
        triggerAuto15GB: !1,
        dumpNumber: dumpNumber,
        success: !0,
      }),
      { success: !0, heapPath: heapPath, diagPath: diagPath, diagnostics: diagnostics }
    );
  } catch (err) {
    let error = toError(err);
    if (isSyscallError(error))
      logForDebugging(`[HeapDump] Failed to write dump: ${error.message}`, { level: "error" });
    else logError(error);
    return (
      logEvent("tengu_heap_dump", {
        triggerManual: !0,
        triggerAuto15GB: !1,
        dumpNumber: dumpNumber,
        success: !1,
      }),
      { success: !1, error: error.message }
    );
  }
}
//@ chunk-0ffn6ajs.js:4354-4446 fingerprint = writeHeapSnapshot (0.846)
async function writeHeapSnapshot(filepath) {
  (writeFileSync(filepath, Bun.generateHeapSnapshot("v8", "arraybuffer"), { mode: 384 }), Bun.gc(!0));
}

export { performHeapDump };
