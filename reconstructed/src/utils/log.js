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
import { uft, jwr } from "./systemReminder.js";
import { toError, errorStackOrMessage } from "./errors.js";
import { isEnvTruthy } from "./envUtils.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { setLastAPIRequest, setLastAPIRequestMessages } from "../bootstrap/state.js";

//@ chunk-bbtre4r8.js:14747-15020 facade-exports = getLogDisplayTitle (0.847)
function getLogDisplayTitle(log, defaultTitle) {
  let r = log.firstPromptShown ?? log.firstPrompt,
    isAutonomousPrompt = r?.startsWith(`<${TICK}>`),
    strippedFirstPrompt = r ? uft(r) : "",
    a = strippedFirstPrompt && !isAutonomousPrompt,
    i =
      log.agentName ||
      log.customTitle ||
      log.aiTitle ||
      log.summary ||
      (a ? strippedFirstPrompt : void 0) ||
      defaultTitle ||
      (isAutonomousPrompt ? "Autonomous session" : void 0) ||
      (log.sessionId ? log.sessionId.slice(0, 8) : "") ||
      "";
  return jwr(i).trim();
}
//@ chunk-bbtre4r8.js:15020-15080 facade-exports
function dateToFilename(t) {
  return t.toISOString().replace(/[:.]/g, "-");
}
//@ chunk-bbtre4r8.js:15080-15097 layout
var Q = 100,
  Z = 1000;
//@ chunk-bbtre4r8.js:15097-16155 fingerprint = attachErrorLogSink (0.433)
class attachErrorLogSink_2 {
  recentErrors = [];
  queue = [];
  droppedBeforeSink = 0;
  sink = null;
  hardFailMode = void 0;
  maxRememberedChars = void 0;
  remember(t) {
    if (this.recentErrors.length >= Q) this.recentErrors.shift();
    let maxRememberedChars = this.maxRememberedChars;
    this.recentErrors.push(
      maxRememberedChars === void 0 || t.error.length <= maxRememberedChars
        ? t
        : {
            ...t,
            error: `error text not remembered: it has ${t.error.length} characters, over this process's fixed limit of ${maxRememberedChars} per error`,
          },
    );
  }
  dispatch(t) {
    if (this.sink === null) {
      if (this.queue.length >= Z) {
        this.droppedBeforeSink++;
        return;
      }
      this.queue.push(t);
      return;
    }
    switch (t.type) {
      case "error":
        this.sink.logError(t.error);
        break;
      case "mcpError":
        this.sink.logMCPError(t.serverName, t.error);
        break;
      case "mcpDebug":
        this.sink.logMCPDebug(t.serverName, t.message);
        break;
    }
  }
  attachSink(t) {
    if (this.sink !== null) return;
    this.sink = t;
    let queue = this.queue;
    this.queue = [];
    for (let r of queue) this.dispatch(r);
  }
  isHardFailMode() {
    return ((this.hardFailMode ??= process.argv.includes("--hard-fail")), this.hardFailMode);
  }
  reset() {
    ((this.recentErrors = []),
      (this.queue = []),
      (this.droppedBeforeSink = 0),
      (this.sink = null),
      (this.hardFailMode = void 0),
      (this.maxRememberedChars = void 0));
  }
}
//@ chunk-bbtre4r8.js:16155-16169 facade-exports
var errorLogBuffer = new attachErrorLogSink_2();
//@ chunk-bbtre4r8.js:16169-16203 facade-exports
function attachErrorLogSink(t) {
  errorLogBuffer.attachSink(t);
}
/**
 * 记录错误：写入错误日志与内存环形缓冲（有长度上限），非生产时输出调试；被约 1790 处调用。
 */
//@ chunk-bbtre4r8.js:16203-16666 facade-exports = logError (0.598)
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
    let errorInfo = { error: errorStackOrMessage(err), timestamp: new Date().toISOString() };
    (errorLogBuffer.remember(errorInfo), errorLogBuffer.dispatch({ type: "error", error: err }));
  } catch {}
}
//@ chunk-bbtre4r8.js:16666-16709 facade-exports
function getInMemoryErrors() {
  return [...errorLogBuffer.recentErrors];
}
//@ chunk-bbtre4r8.js:16709-16791 facade-exports = logMCPError (0.734)
function logMCPError(serverName, error) {
  try {
    errorLogBuffer.dispatch({ type: "mcpError", serverName: serverName, error: error });
  } catch {}
}
//@ chunk-bbtre4r8.js:16791-16875 facade-exports = logMCPDebug (0.734)
function logMCPDebug(serverName, message) {
  try {
    errorLogBuffer.dispatch({ type: "mcpDebug", serverName: serverName, message: message });
  } catch {}
}
//@ chunk-bbtre4r8.js:16875-16949 facade-exports
function keepsMCPDebug() {
  try {
    return errorLogBuffer.sink?.keepsMCPDebug?.() ?? !0;
  } catch {
    return !0;
  }
}
//@ chunk-bbtre4r8.js:16949-17070 facade-exports = isMainThreadSource (1)
function captureAPIRequest(t, e, r) {
  if (!e || !e.startsWith("repl_main_thread")) return;
  if (!r) return;
  let { messages: messages, ...o } = t;
  (setLastAPIRequest(o), setLastAPIRequestMessages(null));
}
//@ chunk-s67w32sp.js:5050-5139 fingerprint = dateToFilename (0.673)
function dateToFilename_2(date) {
  let parse = Date.parse(date);
  return new Date(Number.isFinite(parse) ? parse : 0).toISOString();
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
