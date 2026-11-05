/**
 * screens/repl/engineTurnReader.ts
 *
 * 2.1.316 新增。读取引擎回合事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { parseTaskNotificationToolUseId } from "../../services/tools/detachedToolCalls.js";
import { Stream } from "../../utils/stream.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  createRefusalFallbackMessage,
  createRefusalNoFallbackMessage,
  convertCompactBoundaryMessage,
  createConsentFallbackMessage,
} from "../../remote/sdkMessageAdapter.js";
import { createModelFallbackSystemMessage, createApiErrorMessage } from "../../utils/messages.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { errorMessage } from "../../utils/errors.js";
import { normalizeSdkNotification } from "../../context/notifications.js";
import { emitStatusChange, forwardStreamEventToBridge } from "../../state/onChangeAppState.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1538336-1538387 placement
function isBusyOrPending(guard, pendingCheck) {
  return (command) => guard.isRunning || (pendingCheck() && command());
}
//@ chunk-czq1j3j2.js:1538387-1538554 placement
/**
 * 是否有等待结果的任务或待处理的任务通知。
 */
function hasPendingTaskResults(registry, commandQueue) {
  return (
    registry.awaitingResult().length > 0 ||
    commandQueue.some(
      (command) =>
        command.mode === "task-notification" &&
        command.passive !== true &&
        isMainAgentCommand(command) &&
        typeof command.value === "string" &&
        parseTaskNotificationToolUseId(command.value) !== null,
    )
  );
}
//@ chunk-czq1j3j2.js:1538554-1538803 placement
/**
 * 等待中的任务都停止时调用回调，返回取消订阅函数。
 */
function onAwaitedTasksStopped(registry, onStopped) {
  let awaited = registry.awaitingResult();
  if (awaited.length === 0) return () => {};
  let unsubscribe = registry.subscribe(() => {
    let snapshot = registry.getSnapshot();
    let allDone = true;
    for (let id of awaited) {
      let row = snapshot.get(id);
      if (row?.status === "running") return;
      if (row?.status !== "stopped") allDone = false;
    }
    unsubscribe();
    if (allDone) onStopped();
  });
  return unsubscribe;
}
//@ chunk-czq1j3j2.js:1538803-1538813 placement
var SLOW_TURN_READ_LOG_MS = 5;
//@ chunk-czq1j3j2.js:1538813-1542582 placement
/**
 * 读取引擎回合：消费查询引擎事件流，转成 REPL 消息、进度与结果。
 */
async function readEngineTurn({
  engine,
  feed,
  turnInput,
  newMessages,
  onQueryEvent,
  addNotification,
  onMainRequestStart,
  onRead,
  onStatus,
}) {
  feed.pendingQueryParams.push(turnInput);
  let last = newMessages.findLast((newMessage) => newMessage.type === "user");
  if (feed.input === null) {
    let inputStream = new Stream();
    feed.input = inputStream;
    engine.streamInput(inputStream).catch(logError);
  }
  feed.input.enqueue({
    type: "user",
    message: last?.message ?? {
      role: "user",
      content: "",
    },
    parent_tool_use_id: null,
  });
  let now = Date.now();
  let readLock = await feed.readLock.acquire();
  let lockWaitMs = Date.now() - now;
  if (lockWaitMs >= SLOW_TURN_READ_LOG_MS)
    logForDebugging(`[engine] turn read waited ${lockWaitMs}ms for the previous turn's result`);
  let resultMessage;
  try {
    onRead?.();
    while (true) {
      let { value: event, done } = await engine.next();
      if (done) break;
      if (event.type === "system" && event.subtype === "api_retry") continue;
      if (event.type === "system" && event.subtype === "model_refusal_fallback") {
        onQueryEvent(createRefusalFallbackMessage(event));
        continue;
      }
      if (event.type === "system" && event.subtype === "model_refusal_no_fallback") {
        onQueryEvent(createRefusalNoFallbackMessage(event));
        continue;
      }
      if (event.type === "system" && event.subtype === "memory_recall") continue;
      if (event.type === "system" && event.subtype === "thinking_tokens" && "estimated_tokens_delta" in event)
        continue;
      if (event.type === "system" && event.subtype === "compact_boundary") {
        onQueryEvent(convertCompactBoundaryMessage(event));
        continue;
      }
      if (event.type === "system" && event.subtype === "model_fallback") {
        onQueryEvent(createModelFallbackSystemMessage(event));
        continue;
      }
      if (event.type === "system" && event.subtype === "model_consent_fallback") {
        onQueryEvent(createConsentFallbackMessage(event));
        continue;
      }
      if (event.type === "result") {
        resultMessage = event;
        if (event.is_error) {
          let errorText = event.subtype === "success" ? event.result : event.errors.join("; ");
          logForDebugging(
            `[engine] turn ended in error: ${errorText}`,
            isAbortedTerminalReason(event.terminal_reason)
              ? undefined
              : {
                  level: "error",
                },
          );
          if (event.subtype === "error_during_execution" && !isAbortedTerminalReason(event.terminal_reason))
            try {
              onQueryEvent(
                createApiErrorMessage({
                  content: errorText,
                }),
              );
            } catch (error) {
              logForDebugging(`[engine] failed to render degraded-turn error: ${errorMessage(error)}`, {
                level: "error",
              });
            }
        }
        break;
      }
      if (event.type === "system" && event.subtype === "notification") {
        addNotification(normalizeSdkNotification(event));
        continue;
      }
      if (event.type === "system" && event.subtype === "status") {
        if (event.status === "requesting") onMainRequestStart();
        emitStatusChange({
          status: event.status,
          permissionMode: event.permissionMode,
          compactResult: event.compact_result,
          compactError: event.compact_error,
        });
        onStatus?.(event.compact_result);
        continue;
      }
      if (event.type === "system" && event.subtype === "permission_denied") continue;
      if (
        event.type === "system" &&
        (event.subtype === "task_started" ||
          event.subtype === "task_progress" ||
          event.subtype === "task_updated" ||
          event.subtype === "task_notification" ||
          event.subtype === "background_tasks_changed" ||
          event.subtype === "feedback_draft_queued" ||
          event.subtype === "task_summary" ||
          event.subtype === "session_metadata" ||
          event.subtype === "session_state_changed" ||
          event.subtype === "post_turn_summary" ||
          event.subtype === "hook_started" ||
          event.subtype === "hook_progress" ||
          event.subtype === "hook_response" ||
          event.subtype === "commands_changed" ||
          event.subtype === "elicitation_complete" ||
          event.subtype === "files_persisted" ||
          event.subtype === "mirror_error" ||
          event.subtype === "code_change_published" ||
          event.subtype === "ui_invalidate" ||
          event.subtype === "ui_log" ||
          event.subtype === "ui_toast" ||
          event.subtype === "ui_status" ||
          event.subtype === "ui_panes" ||
          event.subtype === "ui_placed" ||
          event.subtype === "ui_scroll" ||
          event.subtype === "ui_focus" ||
          event.subtype === "permission_check_status" ||
          event.subtype === "vcs_state_changed" ||
          event.subtype === "dev_intent" ||
          event.subtype === "session_title_changed" ||
          event.subtype === "turn_preempted" ||
          event.subtype === "per_turn_effort_changed" ||
          event.subtype === "file_attachments_missing")
      )
        continue;
      if (event.type === "system" && event.subtype === "informational" && !("timestamp" in event)) continue;
      if (event.type === "tool_progress") continue;
      if (event.type === "tool_use_summary") continue;
      if (event.type === "assistant" && "parent_tool_use_id" in event) continue;
      if (event.type === "auth_status") continue;
      if (event.type === "prompt_suggestion") continue;
      if (event.type === "system" && event.subtype === "init") continue;
      if (event.type === "rate_limit_event") continue;
      if (event.type === "conversation_reset") continue;
      if (event.type === "command_lifecycle") continue;
      if (event.type === "stream_event") {
        forwardStreamEventToBridge(event);
        onQueryEvent(event);
        continue;
      }
      onQueryEvent(event);
    }
  } catch (error) {
    engine.interrupt("consumer-error", {
      scope: "turn-cancel",
    });
    let nextResult = await engine.next();
    while (!nextResult.done && nextResult.value.type !== "result") nextResult = await engine.next();
    throw error;
  } finally {
    readLock();
  }
  return resultMessage;
}
//@ chunk-czq1j3j2.js:1542582-1542833 placement
/**
 * 更新工具提示表（clear 删除、其他覆盖）。
 */
function applyToolHint(hints, hint) {
  if (hint.kind === "clear") {
    if (!hints.has(hint.toolUseId)) return hints;
    let copy = new Map(hints);
    copy.delete(hint.toolUseId);
    return copy;
  }
  let existing = hints.get(hint.toolUseId);
  if (hint.kind === "background_hint" && existing?.kind === hint.kind) return hints;
  let nextHints = new Map(hints);
  nextHints.set(hint.toolUseId, hint);
  return nextHints;
}
//@ chunk-czq1j3j2.js:1542833-1542969 placement
/**
 * 删除已完成工具的提示。
 */
function dropToolHints(toolProgress, ids) {
  if (toolProgress.size === 0) return toolProgress;
  let copy = null;
  for (let key of toolProgress.keys())
    if (ids.has(key)) {
      if (copy === null) copy = new Map(toolProgress);
      copy.delete(key);
    }
  return copy ?? toolProgress;
}
//@ chunk-czq1j3j2.js:1542969-1543763 placement
class FlushBatcher {
  pending = null;
  cancelScheduledFlush = null;
  scheduleTimeout;
  onFlush;
  flushIntervalMs;
  boundFlush;
  constructor({ scheduleTimeout, onFlush, flushIntervalMs }) {
    this.scheduleTimeout = scheduleTimeout;
    this.onFlush = onFlush;
    this.flushIntervalMs = flushIntervalMs;
    this.boundFlush = this.flush.bind(this);
  }
  apply(reducer) {
    let nextPending = reducer(this.pending);
    if (nextPending === null) {
      this.clear();
      return;
    }
    this.pending = nextPending;
    if (this.cancelScheduledFlush === null)
      this.cancelScheduledFlush = this.scheduleTimeout(this.boundFlush, this.flushIntervalMs);
  }
  clear() {
    this.pending = null;
    this.dispose();
    this.onFlush(null);
  }
  peek() {
    return this.pending;
  }
  flushNow() {
    if (this.cancelScheduledFlush !== null) {
      this.dispose();
      this.flush();
    }
  }
  dispose() {
    if (this.cancelScheduledFlush !== null) {
      this.cancelScheduledFlush();
      this.cancelScheduledFlush = null;
    }
  }
  flush() {
    this.cancelScheduledFlush = null;
    this.onFlush(this.pending);
  }
}
//@ chunk-czq1j3j2.js:1543763-1543893 placement
/**
 * 创建批量刷新器（默认 100ms）。
 */
function createFlushBatcher({ scheduleTimeout, onFlush, flushIntervalMs = 100 }) {
  return new FlushBatcher({
    scheduleTimeout,
    onFlush,
    flushIntervalMs,
  });
}
//@ chunk-czq1j3j2.js:1543893-1543984 placement
var TURN_RESULT_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DRAIN_POLL_MS;
var inFlightByShell;
var drainedShells;
var completedShellLines;
var DRAINED_SHELL_MARK;
var DRAINED_SHELL_LINE;
var MIN_SHELL_WIDTH_SLACK;
deferInit("chunk-czq1j3j2.js:1543893", () => {
  TURN_RESULT_TIMEOUT_MS = 30000;
  DRAIN_POLL_MS = 500;
  inFlightByShell = new Map();
  drainedShells = new Set();
  completedShellLines = [];
  DRAINED_SHELL_MARK = [];
  DRAINED_SHELL_LINE = "drained-shell-line";
  MIN_SHELL_WIDTH_SLACK = 2;
});
//@ chunk-czq1j3j2.js:1543984-1544064 placement
function endsBeforeLastLine(text) {
  let index = text.lastIndexOf(`
`);
  return index !== -1 && /\S/.test(text.slice(0, index));
}
//@ chunk-czq1j3j2.js:1544064-1544178 placement
/**
 * 末行接近终端宽度。
 */
function isLineNearlyFull(text, columns) {
  let index = text.lastIndexOf(`
`);
  if (endsBeforeLastLine(text)) return true;
  let sliced = text.slice(index + 1);
  return /\S/.test(sliced) && bunStringWidth(sliced) >= columns - MIN_SHELL_WIDTH_SLACK;
}
export {
  onAwaitedTasksStopped,
  hasPendingTaskResults,
  readEngineTurn,
  completedShellLines,
  inFlightByShell,
  drainedShells,
  DRAINED_SHELL_MARK,
  createFlushBatcher,
  isLineNearlyFull,
  endsBeforeLastLine,
  TURN_RESULT_TIMEOUT_MS,
  applyToolHint,
  DRAINED_SHELL_LINE,
  dropToolHints,
  DRAIN_POLL_MS,
  isBusyOrPending,
};
