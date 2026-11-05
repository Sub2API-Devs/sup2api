/**
 * utils/errorLogSink.ts
 *
 * 错误日志 sink：errors/<日期>.jsonl、mcp-logs-<server>/<日期>.jsonl；混有 history purge 与转录路径辅助代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/errorLogSink.ts
 * pieces: chunk-50ktwjzn.js (1), chunk-5qsfbz2c.js (1), chunk-p13f9wk2.js (11), chunk-pcv9zvvv.js (1)
 * attribution: fingerprint 7, callgraph-witnessed 2, layout 2, sole-consumer 1, affinity 1, facade-exports 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { storageNameSpellings } from "./storage/storageSpaces.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { dateToFilename, attachErrorLogSink, errorLogBuffer, logError } from "./log.js";
import { CACHE_PATHS, getCwdSafe } from "./cachePaths.js";
import { logFirstInternalError } from "./telemetry/thirdPartyEventRecords.js";
import { trackError } from "../services/errorTracking/errorTracking.js";
import { errorStackOrMessage } from "./errors.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { logForDebugging, debugLogTakesLevel } from "./debug.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";
import { getSessionId, onPendingLoopWakeupChange } from "../bootstrap/state.js";
import { env } from "./env.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { BatchedLogWriter } from "./batchedLogWriter.js";
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { isActingAsBgJob, getBgJobDir } from "./concurrentSessions.js";
import { isShuttingDown } from "./gracefulShutdown.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { writePendingWakeup } from "./scheduledWakeup.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5qsfbz2c.js:747-809 fingerprint (2.1.88 match: getErrorsPath, 1)
function hasJsonlFiles(session) {
  return storageNameSpellings(session).some((spelling) => spelling.endsWith(".jsonl"));
}
//@ chunk-pcv9zvvv.js:2484-2598 fingerprint (2.1.88 match: _clearLogWritersForTesting, 0.686)
function setDisposableInterval(callback, intervalMs, options = {}) {
  let interval = setInterval(callback, intervalMs);
  if (options.unref) interval.unref?.();
  return {
    [Symbol.dispose]: () => clearInterval(interval),
  };
}
//@ chunk-p13f9wk2.js:700-728 callgraph-witnessed (2.1.88 match: DATE, 0)
var getTodayLogDate; // deferred: uses dateToFilename (./log.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p13f9wk2.js:700", () => {
  getTodayLogDate = memoizeAlias(() => dateToFilename(new Date()));
});
//@ chunk-p13f9wk2.js:728-777 layout (2.1.88 match: getErrorsPath, 1)
/**
 * 错误日志文件 <缓存目录 claude-cli>/errors/<YYYY-MM-DD>.jsonl。
 */
function getErrorLogFilePath() {
  return join(CACHE_PATHS.errors(), getTodayLogDate() + ".jsonl");
}
//@ chunk-p13f9wk2.js:777-829 fingerprint (2.1.88 match: getMCPLogsPath, 1)
/**
 * MCP 日志文件 <缓存目录>/mcp-logs-<server>/<日期>.jsonl。
 */
function getMCPLogsPath(serverName) {
  return join(CACHE_PATHS.mcpLogs(serverName), getTodayLogDate() + ".jsonl");
}
//@ chunk-p13f9wk2.js:1771-1796 sole-consumer
function logErrorSinkNoop(message, errorLogFilePath, perRuntimePath) {
  return;
}
//@ chunk-p13f9wk2.js:1796-2049 affinity (2.1.88 match: extractErrorDetail, 1)
function extractErrorMessage(data) {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    let data_2 = data;
    if (typeof data_2.message === "string") return data_2.message;
    if (
      typeof data_2.error === "object" &&
      data_2.error &&
      "message" in data_2.error &&
      typeof data_2.error.message === "string"
    )
      return data_2.error.message;
  }
  return;
}
//@ chunk-p13f9wk2.js:2049-2376 fingerprint (2.1.88 match: logErrorImpl, 0.949)
/**
 * 错误日志 sink：调试日志记一行 error，并把 {error} 追加到 <缓存目录>/errors/<日期>.jsonl。
 */
function logErrorImpl(message, error) {
  logFirstInternalError(error);
  trackError(error);
  let errorStr = errorStackOrMessage(error);
  let context = "";
  if (axios_default.isAxiosError(error) && error.config?.url) {
    let parts = [`url=${error.config.url}`];
    if (error.response?.status !== undefined) parts.push(`status=${error.response.status}`);
    let serverMessage = extractErrorMessage(error.response?.data);
    if (serverMessage) parts.push(`body=${serverMessage}`);
    context = `[${parts.join(",")}] `;
  }
  logForDebugging(`${error.name}: ${context}${errorStr}`, {
    level: "error",
  });
  logErrorSinkNoop(message, getErrorLogFilePath(), {
    error: `${context}${errorStr}`,
  });
}
//@ chunk-p13f9wk2.js:2376-2586 callgraph-witnessed (2.1.88 match: logMCPErrorImpl, 0.739)
function logMCPErrorImpl(sink, serverName, error) {
  logForDebugging(`MCP server "${serverName}" ${error}`, {
    level: "error",
  });
  let logFile = getMCPLogsPath(serverName);
  let errorStr = error instanceof Error ? errorStackOrMessage(error) : String(error);
  let errorInfo = {
    error: redactSecrets(errorStr),
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: getCwdSafe(),
  };
  sink.writerFor(logFile).write(errorInfo);
}
//@ chunk-p13f9wk2.js:2586-2656 layout
/**
 * CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES 为真时不写 MCP 调试日志文件。
 */
function shouldSkipMcpDebugLogFiles() {
  return env.CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES === true && isRemoteManagedEnvironment();
}
//@ chunk-p13f9wk2.js:2656-2827 fingerprint (2.1.88 match: logMCPDebugImpl, 0.859)
function logMCPDebugImpl(sink, serverName, message) {
  logForDebugging(`MCP server "${serverName}": ${message}`);
  if (shouldSkipMcpDebugLogFiles()) return;
  let logFile = getMCPLogsPath(serverName);
  let debugInfo = {
    debug: redactSecrets(message),
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: getCwdSafe(),
  };
  sink.writerFor(logFile).write(debugInfo);
}
//@ chunk-p13f9wk2.js:2827-3003 facade-exports
function initializeErrorLogSink() {
  attachErrorLogSink(initializeErrorLogSink_2(new BatchedLogWriter()));
  let droppedBeforeSink = errorLogBuffer.droppedBeforeSink;
  logForDebugging(
    droppedBeforeSink === 0
      ? "Error log sink initialized"
      : `Error log sink initialized; ${droppedBeforeSink} events logged before it attached were dropped`,
  );
}
//@ chunk-p13f9wk2.js:3003-3139 fingerprint (2.1.88 match: initializeErrorLogSink, 0.586)
/**
 * 创建错误日志 sink：logError / logMCPError / logMCPDebug（MCP 写 <缓存目录>/mcp-logs-<server>/<日期>.jsonl）。
 */
function initializeErrorLogSink_2(options) {
  return {
    logError: (error) => logErrorImpl(options, error),
    logMCPError: (serverName, error) => logMCPErrorImpl(options, serverName, error),
    logMCPDebug: (serverName, message) => logMCPDebugImpl(options, serverName, message),
    keepsMCPDebug: () => !shouldSkipMcpDebugLogFiles() || debugLogTakesLevel("debug"),
  };
}
//@ chunk-50ktwjzn.js:1126-1477 fingerprint (2.1.88 match: createJsonlWriter, 1)
class SerialWriteQueue {
  #o = Promise.resolve();
  #r = 0;
  #e;
  #i;
  constructor() {
    this.#i = onPendingLoopWakeupChange(this.#n);
  }
  #n = (message) => {
    try {
      if (!isActingAsBgJob()) return;
      let dir = getBgJobDir();
      if (dir === undefined) return;
      if (message !== undefined && isShuttingDown()) return;
      this.#e ??= registerCleanup(() => this.#o);
      let seq = ++this.#r;
      this.#o = this.#o.then(() => (seq === this.#r ? writePendingWakeup(dir, message) : undefined));
    } catch (error) {
      logError(error);
    }
  };
  flush() {
    return this.#o;
  }
  dispose() {
    this.#i();
    this.#o.then(() => this.#e?.());
  }
}
export { SerialWriteQueue, hasJsonlFiles, initializeErrorLogSink, setDisposableInterval };
