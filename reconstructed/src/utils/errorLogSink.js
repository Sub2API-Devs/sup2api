/**
 * utils/errorLogSink.ts
 *
 * 错误日志 sink：errors/<日期>.jsonl、mcp-logs-<server>/<日期>.jsonl；混有 history purge 与转录路径辅助代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/errorLogSink.ts
 * pieces: chunk-3g8vhh6f.js (1), chunk-425yaf76.js (1), chunk-7t4fmt2f.js (1), chunk-k7fgdyw5.js (11)
 * attribution: fingerprint 7, callgraph-witnessed 2, layout 2, sole-consumer 1, affinity 1, facade-exports 1
 */
import { join } from "path";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { dateToFilename, attachErrorLogSink, errorLogBuffer, logError } from "./log.js";
import { CACHE_PATHS, getCwdSafe } from "./cachePaths.js";
import { logFirstInternalError } from "./telemetry/thirdPartyEventRecords.js";
import { trackError } from "../services/errorTracking/errorTracking.js";
import { errorStackOrMessage } from "./errors.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { logForDebugging, debugLogTakesLevel } from "./debug.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { getSessionId, onPendingLoopWakeupChange } from "../bootstrap/state.js";
import { env } from "./env.js";
import { mn } from "./remoteEnvironment.js";
import { BatchedLogWriter } from "./batchedLogWriter.js";
import { storageNameSpellings } from "./storage/storageSpaces.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { isActingAsBgJob, getBgJobDir } from "./concurrentSessions.js";
import { isShuttingDown } from "./gracefulShutdown.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { writePendingWakeup } from "./scheduledWakeup.js";

//@ chunk-k7fgdyw5.js:667-695 callgraph-witnessed = DATE (0)
var getTodayLogDate = io(() => dateToFilename(new Date()));
/**
 * 错误日志文件 <缓存目录 claude-cli>/errors/<YYYY-MM-DD>.jsonl。
 */
//@ chunk-k7fgdyw5.js:695-744 layout = getErrorsPath (1)
function getErrorLogFilePath() {
  return join(CACHE_PATHS.errors(), getTodayLogDate() + ".jsonl");
}
/**
 * MCP 日志文件 <缓存目录>/mcp-logs-<server>/<日期>.jsonl。
 */
//@ chunk-k7fgdyw5.js:744-796 fingerprint = getMCPLogsPath (1)
function getMCPLogsPath(serverName) {
  return join(CACHE_PATHS.mcpLogs(serverName), getTodayLogDate() + ".jsonl");
}
//@ chunk-k7fgdyw5.js:1738-1763 sole-consumer
function v(e, r, o) {
  return;
}
//@ chunk-k7fgdyw5.js:1763-2016 affinity = extractErrorDetail (1)
function extractErrorMessage(data) {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    let r = data;
    if (typeof r.message === "string") return r.message;
    if (typeof r.error === "object" && r.error && "message" in r.error && typeof r.error.message === "string")
      return r.error.message;
  }
  return;
}
/**
 * 错误日志 sink：调试日志记一行 error，并把 {error} 追加到 <缓存目录>/errors/<日期>.jsonl。
 */
//@ chunk-k7fgdyw5.js:2016-2343 fingerprint = logErrorImpl (0.949)
function logErrorImpl(e, r) {
  (logFirstInternalError(r), trackError(r));
  let o = errorStackOrMessage(r),
    context = "";
  if (Dt.isAxiosError(r) && r.config?.url) {
    let parts = [`url=${r.config.url}`];
    if (r.response?.status !== void 0) parts.push(`status=${r.response.status}`);
    let serverMessage = extractErrorMessage(r.response?.data);
    if (serverMessage) parts.push(`body=${serverMessage}`);
    context = `[${parts.join(",")}] `;
  }
  (logForDebugging(`${r.name}: ${context}${o}`, { level: "error" }),
    v(e, getErrorLogFilePath(), { error: `${context}${o}` }));
}
//@ chunk-k7fgdyw5.js:2343-2553 callgraph-witnessed = logMCPErrorImpl (0.738)
function logMCPErrorImpl(e, r, o) {
  logForDebugging(`MCP server "${r}" ${o}`, { level: "error" });
  let logFile = getMCPLogsPath(r),
    errorStr = o instanceof Error ? errorStackOrMessage(o) : String(o),
    errorInfo = {
      error: redactSecrets(errorStr),
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      cwd: getCwdSafe(),
    };
  e.writerFor(logFile).write(errorInfo);
}
/**
 * CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES 为真时不写 MCP 调试日志文件。
 */
//@ chunk-k7fgdyw5.js:2553-2623 layout
function shouldSkipMcpDebugLogFiles() {
  return env.CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES === !0 && mn();
}
//@ chunk-k7fgdyw5.js:2623-2794 fingerprint = logMCPDebugImpl (0.859)
function logMCPDebugImpl(e, r, o) {
  if ((logForDebugging(`MCP server "${r}": ${o}`), shouldSkipMcpDebugLogFiles())) return;
  let logFile = getMCPLogsPath(r),
    debugInfo = {
      debug: redactSecrets(o),
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      cwd: getCwdSafe(),
    };
  e.writerFor(logFile).write(debugInfo);
}
//@ chunk-k7fgdyw5.js:2794-2970 facade-exports
function initializeErrorLogSink() {
  attachErrorLogSink(initializeErrorLogSink_2(new BatchedLogWriter()));
  let droppedBeforeSink = errorLogBuffer.droppedBeforeSink;
  logForDebugging(
    droppedBeforeSink === 0
      ? "Error log sink initialized"
      : `Error log sink initialized; ${droppedBeforeSink} events logged before it attached were dropped`,
  );
}
/**
 * 创建错误日志 sink：logError / logMCPError / logMCPDebug（MCP 写 <缓存目录>/mcp-logs-<server>/<日期>.jsonl）。
 */
//@ chunk-k7fgdyw5.js:2970-3106 fingerprint = initializeErrorLogSink (0.586)
function initializeErrorLogSink_2(e) {
  return {
    logError: (r) => logErrorImpl(e, r),
    logMCPError: (r, o) => logMCPErrorImpl(e, r, o),
    logMCPDebug: (r, o) => logMCPDebugImpl(e, r, o),
    keepsMCPDebug: () => !shouldSkipMcpDebugLogFiles() || debugLogTakesLevel("debug"),
  };
}
//@ chunk-3g8vhh6f.js:747-809 fingerprint = getErrorsPath (1)
function hasJsonlFiles(e) {
  return storageNameSpellings(e).some((n) => n.endsWith(".jsonl"));
}
//@ chunk-425yaf76.js:1126-1477 fingerprint = createJsonlWriter (1)
class SerialWriteQueue {
  #o = Promise.resolve();
  #r = 0;
  #e;
  #i;
  constructor() {
    this.#i = onPendingLoopWakeupChange(this.#n);
  }
  #n = (i) => {
    try {
      if (!isActingAsBgJob()) return;
      let r = getBgJobDir();
      if (r === void 0) return;
      if (i !== void 0 && isShuttingDown()) return;
      this.#e ??= registerCleanup(() => this.#o);
      let e = ++this.#r;
      this.#o = this.#o.then(() => (e === this.#r ? writePendingWakeup(r, i) : void 0));
    } catch (error) {
      logError(error);
    }
  };
  flush() {
    return this.#o;
  }
  dispose() {
    (this.#i(), this.#o.then(() => this.#e?.()));
  }
}
//@ chunk-7t4fmt2f.js:2483-2597 fingerprint = _clearLogWritersForTesting (0.685)
function setDisposableInterval(e, r, n = {}) {
  let o = setInterval(e, r);
  if (n.unref) o.unref?.();
  return { [Symbol.dispose]: () => clearInterval(o) };
}

export { SerialWriteQueue, setDisposableInterval, initializeErrorLogSink, hasJsonlFiles };
