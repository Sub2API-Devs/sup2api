/**
 * utils/log.ts
 *
 * 错误日志：logError（被 1790 处调用）、错误日志 sink、会话日志标题。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/log.ts
 * pieces: chunk-bbtre4r8.js (12), chunk-s67w32sp.js (1)
 * attribution: facade-exports 10, layout 1, fingerprint 2
 */
import { TICK } from "../constants/xml.js";
import { unwrapReminderText, textOrReminderWrapped } from "./systemReminder.js";
import { toError, errorStackOrMessage } from "./errors.js";
import { isEnvTruthy } from "./envUtils.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { setLastAPIRequest, setLastAPIRequestMessages } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bbtre4r8.js:14747-15020 facade-exports (2.1.88 match: getLogDisplayTitle, 0.847)
function getLogDisplayTitle(log, defaultTitle) {
  let firstPromptText = log.firstPromptShown ?? log.firstPrompt;
  let isAutonomousPrompt = firstPromptText?.startsWith(`<${TICK}>`);
  let strippedFirstPrompt = firstPromptText ? unwrapReminderText(firstPromptText) : "";
  let useFirstPrompt = strippedFirstPrompt && !isAutonomousPrompt;
  let title =
    log.agentName ||
    log.customTitle ||
    log.aiTitle ||
    log.summary ||
    (useFirstPrompt ? strippedFirstPrompt : undefined) ||
    defaultTitle ||
    (isAutonomousPrompt ? "Autonomous session" : undefined) ||
    (log.sessionId ? log.sessionId.slice(0, 8) : "") ||
    "";
  return textOrReminderWrapped(title).trim();
}
//@ chunk-bbtre4r8.js:15020-15080 facade-exports
function dateToFilename(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}
//@ chunk-bbtre4r8.js:15080-15097 layout
var MAX_REMEMBERED_ERRORS = 100;
var MAX_REMEMBERED_ERROR_CHARS = 1000;
//@ chunk-bbtre4r8.js:15097-16155 fingerprint (2.1.88 match: attachErrorLogSink, 0.433)
class attachErrorLogSink_2 {
  recentErrors = [];
  queue = [];
  droppedBeforeSink = 0;
  sink = null;
  hardFailMode = undefined;
  maxRememberedChars = undefined;
  remember(event) {
    if (this.recentErrors.length >= MAX_REMEMBERED_ERRORS) this.recentErrors.shift();
    let maxRememberedChars = this.maxRememberedChars;
    this.recentErrors.push(
      maxRememberedChars === undefined || event.error.length <= maxRememberedChars
        ? event
        : {
            ...event,
            error: `error text not remembered: it has ${event.error.length} characters, over this process's fixed limit of ${maxRememberedChars} per error`,
          },
    );
  }
  dispatch(event) {
    if (this.sink === null) {
      if (this.queue.length >= MAX_REMEMBERED_ERROR_CHARS) {
        this.droppedBeforeSink++;
        return;
      }
      this.queue.push(event);
      return;
    }
    switch (event.type) {
      case "error":
        this.sink.logError(event.error);
        break;
      case "mcpError":
        this.sink.logMCPError(event.serverName, event.error);
        break;
      case "mcpDebug":
        this.sink.logMCPDebug(event.serverName, event.message);
        break;
    }
  }
  attachSink(sink) {
    if (this.sink !== null) return;
    this.sink = sink;
    let queue = this.queue;
    this.queue = [];
    for (let pendingEvent of queue) this.dispatch(pendingEvent);
  }
  isHardFailMode() {
    this.hardFailMode ??= process.argv.includes("--hard-fail");
    return this.hardFailMode;
  }
  reset() {
    this.recentErrors = [];
    this.queue = [];
    this.droppedBeforeSink = 0;
    this.sink = null;
    this.hardFailMode = undefined;
    this.maxRememberedChars = undefined;
  }
}
//@ chunk-bbtre4r8.js:16155-16169 facade-exports
var errorLogBuffer; // deferred: uses attachErrorLogSink_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bbtre4r8.js:16155", () => {
  errorLogBuffer = new attachErrorLogSink_2();
});
//@ chunk-bbtre4r8.js:16169-16203 facade-exports
function attachErrorLogSink(errorLogSink) {
  errorLogBuffer.attachSink(errorLogSink);
}
//@ chunk-bbtre4r8.js:16203-16666 facade-exports (2.1.88 match: logError, 0.598)
/**
 * 记录错误：写入错误日志与内存环形缓冲（有长度上限），非生产时输出调试；被约 1790 处调用。
 */
function logError(error) {
  let err = toError(error);
  try {
    if (
      isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_ANTHROPIC_AWS) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_MANTLE) ||
      process.env.DISABLE_ERROR_REPORTING ||
      isEssentialTrafficOnly()
    )
      return;
    let errorInfo = {
      error: errorStackOrMessage(err),
      timestamp: new Date().toISOString(),
    };
    errorLogBuffer.remember(errorInfo);
    errorLogBuffer.dispatch({
      type: "error",
      error: err,
    });
  } catch {}
}
//@ chunk-bbtre4r8.js:16666-16709 facade-exports
function getInMemoryErrors() {
  return [...errorLogBuffer.recentErrors];
}
//@ chunk-bbtre4r8.js:16709-16791 facade-exports (2.1.88 match: logMCPError, 0.734)
function logMCPError(serverName, error) {
  try {
    errorLogBuffer.dispatch({
      type: "mcpError",
      serverName,
      error,
    });
  } catch {}
}
//@ chunk-bbtre4r8.js:16791-16875 facade-exports (2.1.88 match: logMCPDebug, 0.734)
function logMCPDebug(serverName, message) {
  try {
    errorLogBuffer.dispatch({
      type: "mcpDebug",
      serverName,
      message,
    });
  } catch {}
}
//@ chunk-bbtre4r8.js:16875-16949 facade-exports
function keepsMCPDebug() {
  try {
    return errorLogBuffer.sink?.keepsMCPDebug?.() ?? true;
  } catch {
    return true;
  }
}
//@ chunk-bbtre4r8.js:16949-17070 facade-exports (2.1.88 match: isMainThreadSource, 1)
function captureAPIRequest(request, querySource, isEligible) {
  if (!querySource || !querySource.startsWith("repl_main_thread")) return;
  if (!isEligible) return;
  let { messages, ...requestWithoutMessages } = request;
  setLastAPIRequest(requestWithoutMessages);
  setLastAPIRequestMessages(null);
}
//@ chunk-s67w32sp.js:5050-5139 fingerprint (2.1.88 match: dateToFilename, 0.673)
function dateToFilename_2(date) {
  let timestamp = Date.parse(date);
  return new Date(Number.isFinite(timestamp) ? timestamp : 0).toISOString();
}
export {
  logError,
  logMCPDebug,
  getInMemoryErrors,
  getLogDisplayTitle,
  logMCPError,
  keepsMCPDebug,
  captureAPIRequest,
  dateToFilename,
  attachErrorLogSink,
  errorLogBuffer,
  dateToFilename_2,
};
