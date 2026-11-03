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
var e9t = 1610612736,
  t9t = 2684354560,
  bN = { normal: 0, high: 1, critical: 2 };
//@ chunk-18hwfzwa.js:783029-783611 fingerprint = useMemoryUsage (0.634)
function useMemoryUsage(h = "high", x = !0) {
  let [D, L] = y(null),
    ee = R("normal");
  return (
    useInterval(() => {
      let ke, Re;
      try {
        ({ heapUsed: ke, rss: Re } = process.memoryUsage());
      } catch (error) {
        logForDebugging(
          `[useMemoryUsage] process.memoryUsage() failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        );
        return;
      }
      let status = ke >= t9t ? "critical" : ke >= e9t ? "high" : "normal";
      if (x && bN[status] >= bN[h] && bN[status] > bN[ee.current])
        (logEvent("tengu_memory_threshold_crossed", {
          rss_mb: Math.round(Re / 1024 / 1024),
          heap_used_mb: Math.round(ke / 1024 / 1024),
          status: fromEnum(status),
        }),
          (ee.current = status));
      L((prev) => {
        if (bN[status] < bN[h]) return prev === null ? prev : null;
        return { heapUsed: ke, status: status };
      });
    }, 1e4),
    D
  );
}

export { useMemoryUsage };
