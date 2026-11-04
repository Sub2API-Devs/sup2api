/**
 * screens/repl/TranscriptStream.ts
 *
 * 2.1.316 新增。转录流。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { createPromptRewriteStore } from "../replDialogState.js";
import { PasteTracker } from "../../components/messages/UserPromptMessage.js";
import {
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
} from "./engineTurnReader.js";
import { createSignal } from "../../utils/signal.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { shortUuid } from "../../utils/transcriptDiagnostics.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import { applyStreamTokenEvent } from "../../components/Spinner.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { logError } from "../../utils/log.js";
import { isHumanTurn_2 } from "../../utils/messagePredicates.js";

//@ chunk-18hwfzwa.js:1502683-1510531 placement
/**
 * TranscriptStream：REPL 转录流，把引擎回合产生的消息增量追加到界面消息列表并处理批量刷新。
 */
class TranscriptStream {
  previewStore = createPromptRewriteStore();
  placeholderTracker = new PasteTracker();
  deferredSlashEchoUuid = null;
  pendingPreservedInsert = null;
  continuationReplacesUuids = null;
  transcriptRetractedUuids = new Set();
  lastMergedContinuation = null;
  _snapshot = {
    streamingToolUses: [],
    streamingThinking: null,
    userInputOnProcessing: undefined,
    placeholderOrigin: undefined,
    followingPromptsOnProcessing: pendingShellLines,
    placeholderWaitedInQueue: false,
    toolProgress: inFlightByShell,
    promptsAwaitingModel: drainedShells,
    settledReply: completedShellLines,
  };
  _changed = createSignal();
  _coalescer;
  _scheduleTimeout;
  _onTimingChange;
  _isStreamingTextVisible;
  _getTranscriptLength;
  _cancelThinkingHide = null;
  _disposed = false;
  _responseLength = 0;
  _lastTokenFlushTime = 0;
  _streamingTextShown = false;
  _apiMetrics = [];
  _inFlightMessageId = null;
  _isMainRequestAwaitingResponse = false;
  constructor({
    scheduleTimeout,
    onTimingChange,
    isStreamingTextVisible,
    getTranscriptLength,
    getColumns,
    getStreamingPreviewHold = () => "none",
    turnHasToolUse = () => false,
    onStreamingTextShown,
  }) {
    this._scheduleTimeout = scheduleTimeout;
    this._onTimingChange = onTimingChange;
    this._isStreamingTextVisible = isStreamingTextVisible;
    this._getTranscriptLength = getTranscriptLength;
    this._coalescer = createFlushBatcher({
      scheduleTimeout,
      onFlush: (text) => {
        let visibleText = text !== null && !this._isStreamingTextVisible() ? null : text;
        this.previewStore.setRaw(visibleText);
        if (
          !this._streamingTextShown &&
          visibleText !== null &&
          this.previewStore.getState().transformed === null &&
          this._previewOnScreen(visibleText, getStreamingPreviewHold(), turnHasToolUse) &&
          isLineNearlyFull(visibleText, getColumns())
        ) {
          this._streamingTextShown = true;
          onStreamingTextShown?.();
        }
      },
    });
  }
  _previewOnScreen(text, hold, turnHasToolUse) {
    switch (hold) {
      case "none":
        return true;
      case "hidden":
        return false;
      case "focus":
        return !turnHasToolUse() && this._snapshot.streamingToolUses.length === 0 && endsBeforeLastLine(text);
    }
  }
  subscribe = this._changed.subscribe;
  getSnapshot = () => this._snapshot;
  setStreamingToolUses = (next) => {
    let streamingToolUses = this._snapshot.streamingToolUses;
    let nextToolUses = typeof next === "function" ? next(streamingToolUses) : next;
    if (nextToolUses === streamingToolUses) return;
    this._publish({
      streamingToolUses: nextToolUses,
    });
  };
  setSettledReply = (reply) => {
    if (reply.length === 0 && this._snapshot.settledReply.length === 0) return;
    this._publish({
      settledReply: reply.length === 0 ? completedShellLines : reply,
    });
  };
  setStreamingThinking = (next) => {
    let streamingThinking = this._snapshot.streamingThinking;
    let nextThinking = typeof next === "function" ? next(streamingThinking) : next;
    if (nextThinking === streamingThinking) return;
    this._cancelThinkingHide?.();
    this._cancelThinkingHide = null;
    this._publish({
      streamingThinking: nextThinking,
    });
    if (this._disposed) return;
    if (nextThinking && !nextThinking.isStreaming && nextThinking.streamingEndedAt) {
      let hideDelayMs = TURN_RESULT_TIMEOUT_MS - (Date.now() - nextThinking.streamingEndedAt);
      if (hideDelayMs > 0)
        this._cancelThinkingHide = this._scheduleTimeout(() => {
          this._cancelThinkingHide = null;
          this.setStreamingThinking(null);
        }, hideDelayMs);
      else this.setStreamingThinking(null);
    }
  };
  setUserInputOnProcessing = (text, origin, waitedInQueue = false) => {
    this._showPromptsOnProcessing(
      text,
      origin,
      text !== undefined && text === this._snapshot.userInputOnProcessing
        ? this._snapshot.followingPromptsOnProcessing
        : pendingShellLines,
      waitedInQueue,
    );
  };
  showDrainedPrompts(prompt, followingPrompts) {
    this._showPromptsOnProcessing(
      prompt.text,
      prompt.origin,
      followingPrompts.length === 0 ? pendingShellLines : followingPrompts,
      true,
    );
  }
  _showPromptsOnProcessing(text, origin, followingPrompts, waitedInQueue) {
    if (text !== undefined) this.placeholderTracker.start(this._getTranscriptLength(), text);
    else this.placeholderTracker.stop();
    let placeholderOrigin = text === undefined ? undefined : origin;
    let placeholderWaitedInQueue = text !== undefined && waitedInQueue;
    if (
      text === this._snapshot.userInputOnProcessing &&
      placeholderWaitedInQueue === this._snapshot.placeholderWaitedInQueue &&
      stableStringifySafe(placeholderOrigin) === stableStringifySafe(this._snapshot.placeholderOrigin) &&
      followingPrompts.length === this._snapshot.followingPromptsOnProcessing.length &&
      followingPrompts.every((prompt, index) => {
        let previous = this._snapshot.followingPromptsOnProcessing[index];
        return (
          prompt.text === previous?.text &&
          stableStringifySafe(prompt.origin) === stableStringifySafe(previous.origin)
        );
      })
    )
      return;
    this._publish({
      userInputOnProcessing: text,
      placeholderOrigin,
      followingPromptsOnProcessing: followingPrompts,
      placeholderWaitedInQueue,
    });
  }
  trackTranscriptWrite(shellId, prompt) {
    if (this.placeholderTracker.track(shellId, prompt) && this._snapshot.userInputOnProcessing !== undefined)
      this._publish({
        userInputOnProcessing: undefined,
        placeholderOrigin: undefined,
        followingPromptsOnProcessing: pendingShellLines,
        placeholderWaitedInQueue: false,
      });
    if (prompt !== shellId) this._sweepResolvedToolProgress(prompt);
  }
  awaitModelFor(prompts) {
    let flattened = prompts.filter(isHumanTurnOrQueuedCommand).flatMap((prompt) => shortUuid(prompt) ?? []);
    if (flattened.length === 0) return;
    this._publish({
      promptsAwaitingModel: new Set([...this._snapshot.promptsAwaitingModel, ...flattened]),
    });
  }
  markModelReceived = () => {
    this._isMainRequestAwaitingResponse = false;
    if (this._snapshot.promptsAwaitingModel.size === 0) return;
    this._publish({
      promptsAwaitingModel: drainedShells,
    });
  };
  emitToolProgress = (progress) => {
    let toolProgress = this._snapshot.toolProgress;
    let nextProgress = applyToolHint(
      progress.kind === "bash_mode_progress"
        ? applyToolHint(toolProgress, {
            kind: "clear",
            toolUseId: DRAINED_SHELL_LINE,
          })
        : toolProgress,
      progress,
    );
    if (nextProgress === toolProgress) return;
    this._publish({
      toolProgress: nextProgress,
    });
  };
  showDrainedShellLine(input, verbose) {
    let hint = {
      kind: "bash_mode_progress",
      toolUseId: DRAINED_SHELL_LINE,
      input,
      progress: null,
      verbose,
    };
    this.emitToolProgress(hint);
    return () => {
      if (this._snapshot.toolProgress.get(DRAINED_SHELL_LINE) === hint)
        this.emitToolProgress({
          kind: "clear",
          toolUseId: DRAINED_SHELL_LINE,
        });
    };
  }
  clearToolProgress() {
    if (this._snapshot.toolProgress.size === 0) return;
    this._publish({
      toolProgress: inFlightByShell,
    });
  }
  _sweepResolvedToolProgress(shells) {
    let toolProgress = this._snapshot.toolProgress;
    if (toolProgress.size === 0) return;
    let resolvedIds = new Set();
    for (let shell of shells) {
      if (shell.type !== "user" || !Array.isArray(shell.message.content)) continue;
      for (let block of shell.message.content)
        if (block.type === "tool_result" && toolProgress.has(block.tool_use_id))
          resolvedIds.add(block.tool_use_id);
    }
    let nextProgress = dropToolHints(toolProgress, resolvedIds);
    if (nextProgress === toolProgress) return;
    this._publish({
      toolProgress: nextProgress,
    });
  }
  get responseLength() {
    return this._responseLength;
  }
  get inFlightMessageId() {
    return this._inFlightMessageId;
  }
  get isMainResponseStreaming() {
    let last = this._apiMetrics.findLast((entry) => entry.id == null);
    return last !== undefined && last.outputTokens == null;
  }
  get isMainRequestAwaitingResponse() {
    return this._isMainRequestAwaitingResponse;
  }
  noteMainRequestAnnounced = () => {
    this._isMainRequestAwaitingResponse = true;
  };
  addResponseLength = (length) => {
    this._responseLength += length;
    let now = Date.now();
    if (now - this._lastTokenFlushTime >= DRAIN_POLL_MS) {
      this._lastTokenFlushTime = now;
      this._mirrorTiming({
        tokenCount: Math.round(this._responseLength / 4),
      });
    }
    if (length > 0 && this._apiMetrics.length > 0) {
      let last = this._apiMetrics.at(-1);
      if (last.outputTokens == null) {
        last.lastTokenTime = Date.now();
        last.endResponseLength = this._responseLength;
      }
    }
  };
  onResponseLength = (nowMs) => {
    if (nowMs.op === "reset") this._zeroResponseLength();
    else this.addResponseLength(nowMs.delta);
  };
  _zeroResponseLength() {
    if (this._responseLength === 0) return;
    this._responseLength = 0;
    this._mirrorTiming({
      tokenCount: 0,
    });
  }
  recordApiMetricsEvent = (event) => {
    if (event.type === "start" && event.messageId != null) this._inFlightMessageId = event.messageId;
    let baseline =
      event.type === "thinking_signature" && isReplBridgeActive()
        ? (this._apiMetrics.findLast((entry) => entry.id == null)?.thinkingTokenEstimate ?? 0)
        : undefined;
    this._responseLength = applyStreamTokenEvent({
      entries: this._apiMetrics,
      responseLength: this._responseLength,
      event,
    });
    if (event.type === "thinking_progress" && isReplBridgeActive()) {
      let last = this._apiMetrics.findLast((entry) => entry.id == null);
      if (last?.thinkingTokenEstimate != null)
        enqueueTaskNotification({
          type: "system",
          subtype: "thinking_tokens",
          estimated_tokens: last.thinkingTokenEstimate,
          estimated_tokens_delta: event.estimatedTokensDelta,
        });
    } else if (baseline !== undefined) {
      let thinkingTokenEstimate = this._apiMetrics.findLast(
        (entry) => entry.id == null,
      )?.thinkingTokenEstimate;
      if (thinkingTokenEstimate != null && thinkingTokenEstimate > baseline)
        enqueueTaskNotification({
          type: "system",
          subtype: "thinking_tokens",
          estimated_tokens: thinkingTokenEstimate,
          estimated_tokens_delta: thinkingTokenEstimate - baseline,
        });
    }
  };
  resetMetrics = () => {
    this._zeroResponseLength();
    this._apiMetrics = [];
    this._inFlightMessageId = null;
  };
  clearApiMetrics() {
    this._apiMetrics = [];
  }
  applyStreamingText = (text) => {
    if (this._disposed) {
      if (text(this._coalescer.peek()) === null) this._coalescer.clear();
      return;
    }
    this._coalescer.apply(text);
  };
  applyTransformedStreamingText = (text) => {
    if (text !== null && text !== "" && !this._isStreamingTextVisible()) return;
    this.previewStore.setTransformed(text);
  };
  applyStreamingRewrite = (rewrite) => {
    if (rewrite !== null && !this._isStreamingTextVisible()) return;
    if (rewrite !== null) this._coalescer.flushNow();
    this.previewStore.setRewrite(rewrite);
  };
  peekStreamingText() {
    return this._coalescer.peek();
  }
  beginTurn() {
    this._zeroResponseLength();
    this._apiMetrics = [];
    this.setStreamingToolUses(clearIfAny);
    this._coalescer.clear();
    this._streamingTextShown = false;
    this.previewStore.setTransformed(null);
    this.previewStore.setRewrite(null);
    this.setSettledReply(completedShellLines);
  }
  reset() {
    this.setUserInputOnProcessing(undefined);
    this.markModelReceived();
    this.resetMetrics();
    this._coalescer.clear();
    this.setStreamingToolUses(clearIfAny);
    this.clearToolProgress();
    if (this.previewStore.getState().salvage !== null) this.previewStore.setSalvage(null);
    this.setSettledReply(completedShellLines);
  }
  dispose() {
    this._disposed = true;
    this._cancelThinkingHide?.();
    this._cancelThinkingHide = null;
    this._coalescer.dispose();
  }
  _publish(patch) {
    this._snapshot = {
      ...this._snapshot,
      ...patch,
    };
    try {
      this._changed.emit();
    } catch (error) {
      logError(error);
    }
  }
  _mirrorTiming(timing) {
    try {
      this._onTimingChange(timing);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-18hwfzwa.js:1510531-1510570 placement
function clearIfAny(list) {
  return list.length > 0 ? [] : list;
}
//@ chunk-18hwfzwa.js:1510570-1510660 placement (2.1.88 match: buildTranscriptEntries, 0.777)
function isHumanTurnOrQueuedCommand(message) {
  return (
    isHumanTurn_2(message) || (message.type === "attachment" && message.attachment.type === "queued_command")
  );
}
export { TranscriptStream };
