/**
 * utils/sinks.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sinks.ts
 * pieces: chunk-j3rk1cz4.js (1)
 * attribution: facade-exports 1
 */
import { initializeErrorLogSink } from "./errorLogSink.js";
import { initializeAnalyticsSink } from "../services/analytics/sink.js";

//@ chunk-j3rk1cz4.js:265-292 facade-exports
function initSinks() {
  (initializeErrorLogSink(), initializeAnalyticsSink());
}

export { initSinks };
