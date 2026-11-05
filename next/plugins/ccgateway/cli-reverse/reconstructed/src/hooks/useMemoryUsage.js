/**
 * hooks/useMemoryUsage.ts
 *
 * 轮询进程内存，越过 high/critical 阈值时记录 tengu_memory_threshold_crossed。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMemoryUsage.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { useInterval } from "../ink/components/Input.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-czq1j3j2.js:815582-815648 affinity
var MEMORY_HIGH_HEAP_BYTES = 1610612736;
var MEMORY_CRITICAL_HEAP_BYTES = 2684354560;
var MEMORY_LEVEL_RANK = {
  normal: 0,
  high: 1,
  critical: 2,
};
//@ chunk-czq1j3j2.js:815648-816230 fingerprint (2.1.88 match: useMemoryUsage, 0.634)
function useMemoryUsage(level = "high", active = true) {
  let [memoryUsage, setMemoryUsage] = useState(null);
  let statusRef = useRef("normal");
  useInterval(() => {
    let heapUsed;
    let rss;
    try {
      ({ heapUsed, rss } = process.memoryUsage());
    } catch (error) {
      logForDebugging(
        `[useMemoryUsage] process.memoryUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      return;
    }
    let status =
      heapUsed >= MEMORY_CRITICAL_HEAP_BYTES
        ? "critical"
        : heapUsed >= MEMORY_HIGH_HEAP_BYTES
          ? "high"
          : "normal";
    if (
      active &&
      MEMORY_LEVEL_RANK[status] >= MEMORY_LEVEL_RANK[level] &&
      MEMORY_LEVEL_RANK[status] > MEMORY_LEVEL_RANK[statusRef.current]
    ) {
      logEvent("tengu_memory_threshold_crossed", {
        rss_mb: Math.round(rss / 1024 / 1024),
        heap_used_mb: Math.round(heapUsed / 1024 / 1024),
        status: fromEnum(status),
      });
      statusRef.current = status;
    }
    setMemoryUsage((prev) => {
      if (MEMORY_LEVEL_RANK[status] < MEMORY_LEVEL_RANK[level]) return prev === null ? prev : null;
      return {
        heapUsed,
        status,
      };
    });
  }, 1e4);
  return memoryUsage;
}
export { useMemoryUsage };
