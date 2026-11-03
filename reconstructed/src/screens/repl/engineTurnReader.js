/**
 * screens/repl/engineTurnReader.ts
 *
 * 2.1.316 新增。读取引擎回合事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 12
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

//@ chunk-18hwfzwa.js:1496841-1496892 placement
function isBusyOrPending(guard, x) {
  return (D) => guard.isRunning || (x() && D());
}
//@ chunk-18hwfzwa.js:1496892-1497059 placement
/**
 * 是否有等待结果的任务或待处理的任务通知。
 */
function hasPendingTaskResults(h, commandQueue) {
  return (
    h.awaitingResult().length > 0 ||
    commandQueue.some(
      (D) =>
        D.mode === "task-notification" &&
        D.passive !== true &&
        isMainAgentCommand(D) &&
        typeof D.value === "string" &&
        parseTaskNotificationToolUseId(D.value) !== null,
    )
  );
}
//@ chunk-18hwfzwa.js:1497059-1497308 placement
/**
 * 等待中的任务都停止时调用回调，返回取消订阅函数。
 */
function onAwaitedTasksStopped(h, x) {
  let D = h.awaitingResult();
  if (D.length === 0) return () => {};
  let L = h.subscribe(() => {
    let snapshot = h.getSnapshot();
    let ke = true;
    for (let Re of D) {
      let Be = snapshot.get(Re);
      if (Be?.status === "running") return;
      if (Be?.status !== "stopped") ke = false;
    }
    L();
    if (ke) x();
  });
  return L;
}
//@ chunk-18hwfzwa.js:1497308-1497318 placement
var SLOW_TURN_READ_LOG_MS = 5;
//@ chunk-18hwfzwa.js:1497318-1501087 placement
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
    let At = new Stream();
    feed.input = At;
    engine.streamInput(At).catch(logError);
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
  let Xe = await feed.readLock.acquire();
  let rt = Date.now() - now;
  if (rt >= SLOW_TURN_READ_LOG_MS)
    logForDebugging(`[engine] turn read waited ${rt}ms for the previous turn's result`);
  let kt;
  try {
    onRead?.();
    while (true) {
      let { value: msg, done: It } = await engine.next();
      if (It) break;
      if (msg.type === "system" && msg.subtype === "api_retry") continue;
      if (msg.type === "system" && msg.subtype === "model_refusal_fallback") {
        onQueryEvent(createRefusalFallbackMessage(msg));
        continue;
      }
      if (msg.type === "system" && msg.subtype === "model_refusal_no_fallback") {
        onQueryEvent(createRefusalNoFallbackMessage(msg));
        continue;
      }
      if (msg.type === "system" && msg.subtype === "memory_recall") continue;
      if (msg.type === "system" && msg.subtype === "thinking_tokens" && "estimated_tokens_delta" in msg)
        continue;
      if (msg.type === "system" && msg.subtype === "compact_boundary") {
        onQueryEvent(convertCompactBoundaryMessage(msg));
        continue;
      }
      if (msg.type === "system" && msg.subtype === "model_fallback") {
        onQueryEvent(createModelFallbackSystemMessage(msg));
        continue;
      }
      if (msg.type === "system" && msg.subtype === "model_consent_fallback") {
        onQueryEvent(createConsentFallbackMessage(msg));
        continue;
      }
      if (msg.type === "result") {
        kt = msg;
        if (msg.is_error) {
          let Ot = msg.subtype === "success" ? msg.result : msg.errors.join("; ");
          logForDebugging(
            `[engine] turn ended in error: ${Ot}`,
            isAbortedTerminalReason(msg.terminal_reason)
              ? undefined
              : {
                  level: "error",
                },
          );
          if (msg.subtype === "error_during_execution" && !isAbortedTerminalReason(msg.terminal_reason))
            try {
              onQueryEvent(
                createApiErrorMessage({
                  content: Ot,
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
      if (msg.type === "system" && msg.subtype === "notification") {
        addNotification(normalizeSdkNotification(msg));
        continue;
      }
      if (msg.type === "system" && msg.subtype === "status") {
        if (msg.status === "requesting") onMainRequestStart();
        emitStatusChange({
          status: msg.status,
          permissionMode: msg.permissionMode,
          compactResult: msg.compact_result,
          compactError: msg.compact_error,
        });
        onStatus?.(msg.compact_result);
        continue;
      }
      if (msg.type === "system" && msg.subtype === "permission_denied") continue;
      if (
        msg.type === "system" &&
        (msg.subtype === "task_started" ||
          msg.subtype === "task_progress" ||
          msg.subtype === "task_updated" ||
          msg.subtype === "task_notification" ||
          msg.subtype === "background_tasks_changed" ||
          msg.subtype === "feedback_draft_queued" ||
          msg.subtype === "task_summary" ||
          msg.subtype === "session_metadata" ||
          msg.subtype === "session_state_changed" ||
          msg.subtype === "post_turn_summary" ||
          msg.subtype === "hook_started" ||
          msg.subtype === "hook_progress" ||
          msg.subtype === "hook_response" ||
          msg.subtype === "commands_changed" ||
          msg.subtype === "elicitation_complete" ||
          msg.subtype === "files_persisted" ||
          msg.subtype === "mirror_error" ||
          msg.subtype === "code_change_published" ||
          msg.subtype === "ui_invalidate" ||
          msg.subtype === "ui_log" ||
          msg.subtype === "ui_toast" ||
          msg.subtype === "ui_status" ||
          msg.subtype === "ui_panes" ||
          msg.subtype === "ui_placed" ||
          msg.subtype === "ui_scroll" ||
          msg.subtype === "ui_focus" ||
          msg.subtype === "permission_check_status" ||
          msg.subtype === "vcs_state_changed" ||
          msg.subtype === "dev_intent" ||
          msg.subtype === "session_title_changed" ||
          msg.subtype === "turn_preempted" ||
          msg.subtype === "per_turn_effort_changed" ||
          msg.subtype === "file_attachments_missing")
      )
        continue;
      if (msg.type === "system" && msg.subtype === "informational" && !("timestamp" in msg)) continue;
      if (msg.type === "tool_progress") continue;
      if (msg.type === "tool_use_summary") continue;
      if (msg.type === "assistant" && "parent_tool_use_id" in msg) continue;
      if (msg.type === "auth_status") continue;
      if (msg.type === "prompt_suggestion") continue;
      if (msg.type === "system" && msg.subtype === "init") continue;
      if (msg.type === "rate_limit_event") continue;
      if (msg.type === "conversation_reset") continue;
      if (msg.type === "command_lifecycle") continue;
      if (msg.type === "stream_event") {
        forwardStreamEventToBridge(msg);
        onQueryEvent(msg);
        continue;
      }
      onQueryEvent(msg);
    }
  } catch (error) {
    engine.interrupt("consumer-error", {
      scope: "turn-cancel",
    });
    let It = await engine.next();
    while (!It.done && It.value.type !== "result") It = await engine.next();
    throw error;
  } finally {
    Xe();
  }
  return kt;
}
//@ chunk-18hwfzwa.js:1501087-1501338 placement
/**
 * 更新工具提示表（clear 删除、其他覆盖）。
 */
function applyToolHint(h, x) {
  if (x.kind === "clear") {
    if (!h.has(x.toolUseId)) return h;
    let ee = new Map(h);
    ee.delete(x.toolUseId);
    return ee;
  }
  let D = h.get(x.toolUseId);
  if (x.kind === "background_hint" && D?.kind === x.kind) return h;
  let L = new Map(h);
  L.set(x.toolUseId, x);
  return L;
}
//@ chunk-18hwfzwa.js:1501338-1501474 placement
/**
 * 删除已完成工具的提示。
 */
function dropToolHints(toolProgress, x) {
  if (toolProgress.size === 0) return toolProgress;
  let D = null;
  for (let key of toolProgress.keys())
    if (x.has(key)) {
      if (D === null) D = new Map(toolProgress);
      D.delete(key);
    }
  return D ?? toolProgress;
}
//@ chunk-18hwfzwa.js:1501474-1502268 placement
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
  apply(h) {
    let x = h(this.pending);
    if (x === null) {
      this.clear();
      return;
    }
    this.pending = x;
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
//@ chunk-18hwfzwa.js:1502268-1502398 placement
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
//@ chunk-18hwfzwa.js:1502398-1502489 placement
var TURN_RESULT_TIMEOUT_MS = 30000;
var DRAIN_POLL_MS = 500;
var inFlightByShell = new Map();
var drainedShells = new Set();
var pendingShellLines = [];
var completedShellLines = [];
var DRAINED_SHELL_LINE = "drained-shell-line";
var MIN_SHELL_WIDTH_SLACK = 2;
//@ chunk-18hwfzwa.js:1502489-1502569 placement
function endsBeforeLastLine(h) {
  let index = h.lastIndexOf(`
`);
  return index !== -1 && /\S/.test(h.slice(0, index));
}
//@ chunk-18hwfzwa.js:1502569-1502683 placement
/**
 * 末行接近终端宽度。
 */
function isLineNearlyFull(h, columns) {
  let index = h.lastIndexOf(`
`);
  if (endsBeforeLastLine(h)) return true;
  let sliced = h.slice(index + 1);
  return /\S/.test(sliced) && bunStringWidth(sliced) >= columns - MIN_SHELL_WIDTH_SLACK;
}
export {
  pendingShellLines,
  inFlightByShell,
  drainedShells,
  completedShellLines,
  createFlushBatcher,
  isLineNearlyFull,
  endsBeforeLastLine,
  TURN_RESULT_TIMEOUT_MS,
  applyToolHint,
  DRAINED_SHELL_LINE,
  dropToolHints,
  DRAIN_POLL_MS,
  onAwaitedTasksStopped,
  hasPendingTaskResults,
  readEngineTurn,
  isBusyOrPending,
};
