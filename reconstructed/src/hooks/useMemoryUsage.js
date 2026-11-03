/**
 * hooks/useMemoryUsage.ts
 *
 * 轮询进程内存，越过 high/critical 阈值时记录 tengu_memory_threshold_crossed。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMemoryUsage.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { y, R } from "../../vendor/react/cjs/react.production.js";
import { useInterval } from "../ink/components/Input.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-18hwfzwa.js:782963-783029 affinity
var MEMORY_HIGH_HEAP_BYTES = 1610612736;
var MEMORY_CRITICAL_HEAP_BYTES = 2684354560;
var MEMORY_LEVEL_RANK = {
  normal: 0,
  high: 1,
  critical: 2,
};
//@ chunk-18hwfzwa.js:783029-783611 fingerprint = useMemoryUsage (0.634)
function useMemoryUsage(h = "high", x = true) {
  let [memoryUsage, setMemoryUsage] = y(null);
  let statusRef = R("normal");
  useInterval(() => {
    let heapUsed;
    let Re;
    try {
      ({ heapUsed, rss: Re } = process.memoryUsage());
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
      x &&
      MEMORY_LEVEL_RANK[status] >= MEMORY_LEVEL_RANK[h] &&
      MEMORY_LEVEL_RANK[status] > MEMORY_LEVEL_RANK[statusRef.current]
    ) {
      logEvent("tengu_memory_threshold_crossed", {
        rss_mb: Math.round(Re / 1024 / 1024),
        heap_used_mb: Math.round(heapUsed / 1024 / 1024),
        status: fromEnum(status),
      });
      statusRef.current = status;
    }
    setMemoryUsage((prev) => {
      if (MEMORY_LEVEL_RANK[status] < MEMORY_LEVEL_RANK[h]) return prev === null ? prev : null;
      return {
        heapUsed,
        status,
      };
    });
  }, 1e4);
  return memoryUsage;
}
export { useMemoryUsage };
