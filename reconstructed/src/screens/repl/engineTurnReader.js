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
import { $f } from "../../utils/messageQueueManager.js";
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
function Ukt(h, x) {
  return (D) => h.isRunning || (x() && D());
}
/**
 * 是否有等待结果的任务或待处理的任务通知。
 */
//@ chunk-18hwfzwa.js:1496892-1497059 placement
function hasPendingTaskResults(h, x) {
  return (
    h.awaitingResult().length > 0 ||
    x.some(
      (D) =>
        D.mode === "task-notification" &&
        D.passive !== !0 &&
        $f(D) &&
        typeof D.value === "string" &&
        parseTaskNotificationToolUseId(D.value) !== null,
    )
  );
}
/**
 * 等待中的任务都停止时调用回调，返回取消订阅函数。
 */
//@ chunk-18hwfzwa.js:1497059-1497308 placement
function onAwaitedTasksStopped(h, x) {
  let awaitingResult = h.awaitingResult();
  if (awaitingResult.length === 0) return () => {};
  let subscribe = h.subscribe(() => {
    let snapshot = h.getSnapshot(),
      ke = !0;
    for (let Re of awaitingResult) {
      let Be = snapshot.get(Re);
      if (Be?.status === "running") return;
      if (Be?.status !== "stopped") ke = !1;
    }
    if ((subscribe(), ke)) x();
  });
  return subscribe;
}
//@ chunk-18hwfzwa.js:1497308-1497318 placement
var $qo = 5;
/**
 * 读取引擎回合：消费查询引擎事件流，转成 REPL 消息、进度与结果。
 */
//@ chunk-18hwfzwa.js:1497318-1501087 placement
async function readEngineTurn({
  engine: engine,
  feed: feed,
  turnInput: turnInput,
  newMessages: newMessages,
  onQueryEvent: onQueryEvent,
  addNotification: addNotification,
  onMainRequestStart: onMainRequestStart,
  onRead: onRead,
  onStatus: onStatus,
}) {
  feed.pendingQueryParams.push(turnInput);
  let last = newMessages.findLast((At) => At.type === "user");
  if (feed.input === null) {
    let At = new Stream();
    ((feed.input = At), engine.streamInput(At).catch(logError));
  }
  feed.input.enqueue({
    type: "user",
    message: last?.message ?? { role: "user", content: "" },
    parent_tool_use_id: null,
  });
  let now = Date.now(),
    acquire = await feed.readLock.acquire(),
    rt = Date.now() - now;
  if (rt >= $qo) logForDebugging(`[engine] turn read waited ${rt}ms for the previous turn's result`);
  let kt;
  try {
    onRead?.();
    while (!0) {
      let { value: At, done: It } = await engine.next();
      if (It) break;
      if (At.type === "system" && At.subtype === "api_retry") continue;
      if (At.type === "system" && At.subtype === "model_refusal_fallback") {
        onQueryEvent(createRefusalFallbackMessage(At));
        continue;
      }
      if (At.type === "system" && At.subtype === "model_refusal_no_fallback") {
        onQueryEvent(createRefusalNoFallbackMessage(At));
        continue;
      }
      if (At.type === "system" && At.subtype === "memory_recall") continue;
      if (At.type === "system" && At.subtype === "thinking_tokens" && "estimated_tokens_delta" in At)
        continue;
      if (At.type === "system" && At.subtype === "compact_boundary") {
        onQueryEvent(convertCompactBoundaryMessage(At));
        continue;
      }
      if (At.type === "system" && At.subtype === "model_fallback") {
        onQueryEvent(createModelFallbackSystemMessage(At));
        continue;
      }
      if (At.type === "system" && At.subtype === "model_consent_fallback") {
        onQueryEvent(createConsentFallbackMessage(At));
        continue;
      }
      if (At.type === "result") {
        if (((kt = At), At.is_error)) {
          let Ot = At.subtype === "success" ? At.result : At.errors.join("; ");
          if (
            (logForDebugging(
              `[engine] turn ended in error: ${Ot}`,
              isAbortedTerminalReason(At.terminal_reason) ? void 0 : { level: "error" },
            ),
            At.subtype === "error_during_execution" && !isAbortedTerminalReason(At.terminal_reason))
          )
            try {
              onQueryEvent(createApiErrorMessage({ content: Ot }));
            } catch (error) {
              logForDebugging(`[engine] failed to render degraded-turn error: ${errorMessage(error)}`, {
                level: "error",
              });
            }
        }
        break;
      }
      if (At.type === "system" && At.subtype === "notification") {
        addNotification(normalizeSdkNotification(At));
        continue;
      }
      if (At.type === "system" && At.subtype === "status") {
        if (At.status === "requesting") onMainRequestStart();
        (emitStatusChange({
          status: At.status,
          permissionMode: At.permissionMode,
          compactResult: At.compact_result,
          compactError: At.compact_error,
        }),
          onStatus?.(At.compact_result));
        continue;
      }
      if (At.type === "system" && At.subtype === "permission_denied") continue;
      if (
        At.type === "system" &&
        (At.subtype === "task_started" ||
          At.subtype === "task_progress" ||
          At.subtype === "task_updated" ||
          At.subtype === "task_notification" ||
          At.subtype === "background_tasks_changed" ||
          At.subtype === "feedback_draft_queued" ||
          At.subtype === "task_summary" ||
          At.subtype === "session_metadata" ||
          At.subtype === "session_state_changed" ||
          At.subtype === "post_turn_summary" ||
          At.subtype === "hook_started" ||
          At.subtype === "hook_progress" ||
          At.subtype === "hook_response" ||
          At.subtype === "commands_changed" ||
          At.subtype === "elicitation_complete" ||
          At.subtype === "files_persisted" ||
          At.subtype === "mirror_error" ||
          At.subtype === "code_change_published" ||
          At.subtype === "ui_invalidate" ||
          At.subtype === "ui_log" ||
          At.subtype === "ui_toast" ||
          At.subtype === "ui_status" ||
          At.subtype === "ui_panes" ||
          At.subtype === "ui_placed" ||
          At.subtype === "ui_scroll" ||
          At.subtype === "ui_focus" ||
          At.subtype === "permission_check_status" ||
          At.subtype === "vcs_state_changed" ||
          At.subtype === "dev_intent" ||
          At.subtype === "session_title_changed" ||
          At.subtype === "turn_preempted" ||
          At.subtype === "per_turn_effort_changed" ||
          At.subtype === "file_attachments_missing")
      )
        continue;
      if (At.type === "system" && At.subtype === "informational" && !("timestamp" in At)) continue;
      if (At.type === "tool_progress") continue;
      if (At.type === "tool_use_summary") continue;
      if (At.type === "assistant" && "parent_tool_use_id" in At) continue;
      if (At.type === "auth_status") continue;
      if (At.type === "prompt_suggestion") continue;
      if (At.type === "system" && At.subtype === "init") continue;
      if (At.type === "rate_limit_event") continue;
      if (At.type === "conversation_reset") continue;
      if (At.type === "command_lifecycle") continue;
      if (At.type === "stream_event") {
        (forwardStreamEventToBridge(At), onQueryEvent(At));
        continue;
      }
      onQueryEvent(At);
    }
  } catch (error) {
    engine.interrupt("consumer-error", { scope: "turn-cancel" });
    let It = await engine.next();
    while (!It.done && It.value.type !== "result") It = await engine.next();
    throw error;
  } finally {
    acquire();
  }
  return kt;
}
/**
 * 更新工具提示表（clear 删除、其他覆盖）。
 */
//@ chunk-18hwfzwa.js:1501087-1501338 placement
function applyToolHint(h, x) {
  if (x.kind === "clear") {
    if (!h.has(x.toolUseId)) return h;
    let ee = new Map(h);
    return (ee.delete(x.toolUseId), ee);
  }
  let D = h.get(x.toolUseId);
  if (x.kind === "background_hint" && D?.kind === x.kind) return h;
  let L = new Map(h);
  return (L.set(x.toolUseId, x), L);
}
/**
 * 删除已完成工具的提示。
 */
//@ chunk-18hwfzwa.js:1501338-1501474 placement
function dropToolHints(h, x) {
  if (h.size === 0) return h;
  let D = null;
  for (let L of h.keys())
    if (x.has(L)) {
      if (D === null) D = new Map(h);
      D.delete(L);
    }
  return D ?? h;
}
//@ chunk-18hwfzwa.js:1501474-1502268 placement
class FlushBatcher {
  pending = null;
  cancelScheduledFlush = null;
  scheduleTimeout;
  onFlush;
  flushIntervalMs;
  boundFlush;
  constructor({ scheduleTimeout: h, onFlush: x, flushIntervalMs: D }) {
    ((this.scheduleTimeout = h),
      (this.onFlush = x),
      (this.flushIntervalMs = D),
      (this.boundFlush = this.flush.bind(this)));
  }
  apply(h) {
    let x = h(this.pending);
    if (x === null) {
      this.clear();
      return;
    }
    if (((this.pending = x), this.cancelScheduledFlush === null))
      this.cancelScheduledFlush = this.scheduleTimeout(this.boundFlush, this.flushIntervalMs);
  }
  clear() {
    ((this.pending = null), this.dispose(), this.onFlush(null));
  }
  peek() {
    return this.pending;
  }
  flushNow() {
    if (this.cancelScheduledFlush !== null) (this.dispose(), this.flush());
  }
  dispose() {
    if (this.cancelScheduledFlush !== null) (this.cancelScheduledFlush(), (this.cancelScheduledFlush = null));
  }
  flush() {
    ((this.cancelScheduledFlush = null), this.onFlush(this.pending));
  }
}
/**
 * 创建批量刷新器（默认 100ms）。
 */
//@ chunk-18hwfzwa.js:1502268-1502398 placement
function createFlushBatcher({
  scheduleTimeout: scheduleTimeout,
  onFlush: onFlush,
  flushIntervalMs: flushIntervalMs = 100,
}) {
  return new FlushBatcher({
    scheduleTimeout: scheduleTimeout,
    onFlush: onFlush,
    flushIntervalMs: flushIntervalMs,
  });
}
//@ chunk-18hwfzwa.js:1502398-1502489 placement
var Kqo = 30000,
  Gqo = 500,
  zkt = new Map(),
  Ykt = new Set(),
  Zee = [],
  ete = [],
  DRAINED_SHELL_LINE = "drained-shell-line",
  Qqo = 2;
//@ chunk-18hwfzwa.js:1502489-1502569 placement
function Xkt(h) {
  let index = h.lastIndexOf(`
`);
  return index !== -1 && /\S/.test(h.slice(0, index));
}
/**
 * 末行接近终端宽度。
 */
//@ chunk-18hwfzwa.js:1502569-1502683 placement
function isLineNearlyFull(h, x) {
  let index = h.lastIndexOf(`
`);
  if (Xkt(h)) return !0;
  let sliced = h.slice(index + 1);
  return /\S/.test(sliced) && bunStringWidth(sliced) >= x - Qqo;
}

export {
  Zee,
  zkt,
  Ykt,
  ete,
  createFlushBatcher,
  isLineNearlyFull,
  Xkt,
  Kqo,
  applyToolHint,
  DRAINED_SHELL_LINE,
  dropToolHints,
  Gqo,
  onAwaitedTasksStopped,
  hasPendingTaskResults,
  readEngineTurn,
  Ukt,
};
