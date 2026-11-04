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

//@ chunk-0ffn6ajs.js:683-3241 fingerprint (2.1.88 match: captureMemoryDiagnostics, 0.836)
/**
 * 采集内存诊断：/proc/self/smaps_rollup、fd 数、堆统计。
 */
async function captureMemoryDiagnostics(trigger, dumpNumber = 0) {
  let usage = process.memoryUsage();
  let heapStats = getHeapStatistics();
  let resourceUsage = process.resourceUsage();
  let uptimeSeconds = process.uptime();
  let heapSpaceStats;
  try {
    heapSpaceStats = getHeapSpaceStatistics();
  } catch {}
  let activeHandles = process._getActiveHandles().length;
  let activeRequests = process._getActiveRequests().length;
  let openFileDescriptors;
  try {
    openFileDescriptors = (await readdir("/proc/self/fd")).length;
  } catch {}
  let smapsRollup;
  try {
    smapsRollup = await readFile("/proc/self/smaps_rollup", "utf8");
  } catch {}
  let objectTypeCounts;
  let protectedObjectTypeCounts;
  let mimalloc;
  try {
    let { heapStats } = await import("bun:jsc");
    let jscStats = heapStats(true);
    objectTypeCounts = jscStats.objectTypeCounts;
    protectedObjectTypeCounts = jscStats.protectedObjectTypeCounts;
    mimalloc = jscStats.mimalloc || undefined;
  } catch {}
  let nativeMemory = usage.rss - usage.heapUsed;
  let bytesPerSecond = uptimeSeconds > 0 ? usage.rss / uptimeSeconds : 0;
  let mbPerHour = (bytesPerSecond * 3600) / 1048576;
  let potentialLeaks = [];
  if (heapStats.number_of_detached_contexts > 0)
    potentialLeaks.push(
      `${heapStats.number_of_detached_contexts} detached context(s) - possible iframe/context leak`,
    );
  if (activeHandles > 100)
    potentialLeaks.push(`${activeHandles} active handles - possible timer/socket leak`);
  if (nativeMemory > usage.heapUsed)
    potentialLeaks.push("Native memory > heap - leak may be in native addons (node-pty, etc.)");
  if (mbPerHour > 100) potentialLeaks.push(`High memory growth rate: ${mbPerHour.toFixed(1)} MB/hour`);
  if (openFileDescriptors && openFileDescriptors > 500)
    potentialLeaks.push(`${openFileDescriptors} open file descriptors - possible file/socket leak`);
  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    trigger,
    dumpNumber,
    uptimeSeconds,
    runtime: alwaysTrue() ? "bun" : "node",
    memoryUsage: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
    },
    memoryGrowthRate: {
      bytesPerSecond,
      mbPerHour,
    },
    v8HeapStats: {
      heapSizeLimit: heapStats.heap_size_limit,
      mallocedMemory: heapStats.malloced_memory,
      peakMallocedMemory: heapStats.peak_malloced_memory,
      detachedContexts: heapStats.number_of_detached_contexts,
      nativeContexts: heapStats.number_of_native_contexts,
    },
    v8HeapSpaces: heapSpaceStats?.map((space) => ({
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
    activeHandles,
    activeRequests,
    openFileDescriptors,
    analysis: {
      potentialLeaks,
      recommendation:
        potentialLeaks.length > 0
          ? `WARNING: ${potentialLeaks.length} potential leak indicator(s) found. See potentialLeaks array.`
          : "No obvious leak indicators. Check heap snapshot for retained objects.",
    },
    smapsRollup,
    objectTypeCounts,
    protectedObjectTypeCounts,
    mimalloc,
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
//@ chunk-0ffn6ajs.js:3241-4354 facade-exports (2.1.88 match: performHeapDump, 0.807)
/**
 * 写堆快照与内存诊断（/heapdump 或内存超限触发）。
 */
async function performHeapDump(trigger = "manual", dumpNumber = 0) {
  if (mayHaveLauncherHostLoginInMemory())
    return {
      success: false,
      error: "heap dumps are unavailable in a launcher-started session",
    };
  try {
    let sessionId = getSessionId();
    let diagnostics = await captureMemoryDiagnostics(trigger, dumpNumber);
    let toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(3);
    logForDebugging(`[HeapDump] Memory state:
  heapUsed: ${toGB(diagnostics.memoryUsage.heapUsed)} GB (in snapshot)
  external: ${toGB(diagnostics.memoryUsage.external)} GB (${diagnostics.runtime === "bun" ? "part of heapUsed, in snapshot" : "NOT in snapshot"})
  rss: ${toGB(diagnostics.memoryUsage.rss)} GB (total process)
  ${diagnostics.analysis.recommendation}`);
    let dumpDir = await getDesktopPath();
    await getFsImplementation().mkdir(dumpDir);
    let suffix = dumpNumber > 0 ? `-dump${dumpNumber}` : "";
    let heapFilename = `${sessionId}${suffix}.heapsnapshot`;
    let diagFilename = `${sessionId}${suffix}-diagnostics.json`;
    let heapPath = join(dumpDir, heapFilename);
    let diagPath = join(dumpDir, diagFilename);
    await writeFile(diagPath, jsonStringify(diagnostics, null, 2), {
      mode: 384,
    });
    logForDebugging(`[HeapDump] Diagnostics written to ${diagPath}`);
    await writeHeapSnapshot(heapPath);
    logForDebugging(`[HeapDump] Heap dump written to ${heapPath}`);
    logEvent("tengu_heap_dump", {
      triggerManual: true,
      triggerAuto15GB: false,
      dumpNumber,
      success: true,
    });
    return {
      success: true,
      heapPath,
      diagPath,
      diagnostics,
    };
  } catch (err) {
    let error = toError(err);
    if (isSyscallError(error))
      logForDebugging(`[HeapDump] Failed to write dump: ${error.message}`, {
        level: "error",
      });
    else logError(error);
    logEvent("tengu_heap_dump", {
      triggerManual: true,
      triggerAuto15GB: false,
      dumpNumber,
      success: false,
    });
    return {
      success: false,
      error: error.message,
    };
  }
}
//@ chunk-0ffn6ajs.js:4354-4446 fingerprint (2.1.88 match: writeHeapSnapshot, 0.846)
async function writeHeapSnapshot(filepath) {
  writeFileSync(filepath, Bun.generateHeapSnapshot("v8", "arraybuffer"), {
    mode: 384,
  });
  Bun.gc(true);
}
export { performHeapDump };
