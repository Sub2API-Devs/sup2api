/**
 * utils/sinks.ts
 *
 * 初始化错误日志与遥测两个 sink 的一行入口（路径沿用旧版）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sinks.ts
 * pieces: chunk-j3rk1cz4.js (1)
 * attribution: facade-exports 1
 */
import { initializeErrorLogSink } from "./errorLogSink.js";
import { initializeAnalyticsSink } from "../services/analytics/sink.js";

//@ chunk-j3rk1cz4.js:265-292 facade-exports
function initSinks() {
  initializeErrorLogSink();
  initializeAnalyticsSink();
}
export { initSinks };
