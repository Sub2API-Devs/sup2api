/**
 * utils/log.ts
 *
 * 错误日志：logError（被 1790 处调用）、错误日志 sink、会话日志标题。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/log.ts
 * pieces: chunk-my2r02mp.js (12)
 * attribution: facade-exports 10, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TICK } from "../constants/xml.js";
import { unwrapReminderText, textOrReminderWrapped } from "./systemReminder.js";
import { toError, errorStackOrMessage } from "./errors.js";
import { isEnvTruthy } from "./envUtils.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { setLastAPIRequest, setLastAPIRequestMessages } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-my2r02mp.js:14897-15171 facade-exports (2.1.88 match: getLogDisplayTitle, 0.847)
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
//@ chunk-my2r02mp.js:15171-15231 facade-exports
function dateToFilename(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}
//@ chunk-my2r02mp.js:15231-15248 layout
var MAX_REMEMBERED_ERRORS = 100;
var MAX_REMEMBERED_ERROR_CHARS = 1000;
//@ chunk-my2r02mp.js:15248-16306 fingerprint (2.1.88 match: attachErrorLogSink, 0.433)
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
//@ chunk-my2r02mp.js:16306-16320 facade-exports
var errorLogBuffer; // deferred: uses attachErrorLogSink_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-my2r02mp.js:16306", () => {
  errorLogBuffer = new attachErrorLogSink_2();
});
//@ chunk-my2r02mp.js:16320-16354 facade-exports
function attachErrorLogSink(errorLogSink) {
  errorLogBuffer.attachSink(errorLogSink);
}
//@ chunk-my2r02mp.js:16354-16817 facade-exports (2.1.88 match: logError, 0.597)
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
//@ chunk-my2r02mp.js:16817-16860 facade-exports
function getInMemoryErrors() {
  return [...errorLogBuffer.recentErrors];
}
//@ chunk-my2r02mp.js:16860-16942 facade-exports (2.1.88 match: logMCPError, 0.734)
function logMCPError(serverName, error) {
  try {
    errorLogBuffer.dispatch({
      type: "mcpError",
      serverName,
      error,
    });
  } catch {}
}
//@ chunk-my2r02mp.js:16942-17026 facade-exports (2.1.88 match: logMCPDebug, 0.734)
function logMCPDebug(serverName, message) {
  try {
    errorLogBuffer.dispatch({
      type: "mcpDebug",
      serverName,
      message,
    });
  } catch {}
}
//@ chunk-my2r02mp.js:17026-17100 facade-exports
function keepsMCPDebug() {
  try {
    return errorLogBuffer.sink?.keepsMCPDebug?.() ?? true;
  } catch {
    return true;
  }
}
//@ chunk-my2r02mp.js:17100-17221 facade-exports (2.1.88 match: isMainThreadSource, 1)
function captureAPIRequest(request, querySource, isEligible) {
  if (!querySource || !querySource.startsWith("repl_main_thread")) return;
  if (!isEligible) return;
  let { messages, ...requestWithoutMessages } = request;
  setLastAPIRequest(requestWithoutMessages);
  setLastAPIRequestMessages(null);
}
export {
  logError,
  logMCPDebug,
  captureAPIRequest,
  getInMemoryErrors,
  logMCPError,
  keepsMCPDebug,
  getLogDisplayTitle,
  dateToFilename,
  attachErrorLogSink,
  errorLogBuffer,
};
