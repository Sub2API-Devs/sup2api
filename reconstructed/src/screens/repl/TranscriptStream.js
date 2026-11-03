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
      onFlush: (He) => {
        let We = He !== null && !this._isStreamingTextVisible() ? null : He;
        this.previewStore.setRaw(We);
        if (
          !this._streamingTextShown &&
          We !== null &&
          this.previewStore.getState().transformed === null &&
          this._previewOnScreen(We, getStreamingPreviewHold(), turnHasToolUse) &&
          isLineNearlyFull(We, getColumns())
        ) {
          this._streamingTextShown = true;
          onStreamingTextShown?.();
        }
      },
    });
  }
  _previewOnScreen(h, x, D) {
    switch (x) {
      case "none":
        return true;
      case "hidden":
        return false;
      case "focus":
        return !D() && this._snapshot.streamingToolUses.length === 0 && endsBeforeLastLine(h);
    }
  }
  subscribe = this._changed.subscribe;
  getSnapshot = () => this._snapshot;
  setStreamingToolUses = (h) => {
    let streamingToolUses = this._snapshot.streamingToolUses;
    let D = typeof h === "function" ? h(streamingToolUses) : h;
    if (D === streamingToolUses) return;
    this._publish({
      streamingToolUses: D,
    });
  };
  setSettledReply = (h) => {
    if (h.length === 0 && this._snapshot.settledReply.length === 0) return;
    this._publish({
      settledReply: h.length === 0 ? completedShellLines : h,
    });
  };
  setStreamingThinking = (h) => {
    let streamingThinking = this._snapshot.streamingThinking;
    let D = typeof h === "function" ? h(streamingThinking) : h;
    if (D === streamingThinking) return;
    this._cancelThinkingHide?.();
    this._cancelThinkingHide = null;
    this._publish({
      streamingThinking: D,
    });
    if (this._disposed) return;
    if (D && !D.isStreaming && D.streamingEndedAt) {
      let L = TURN_RESULT_TIMEOUT_MS - (Date.now() - D.streamingEndedAt);
      if (L > 0)
        this._cancelThinkingHide = this._scheduleTimeout(() => {
          this._cancelThinkingHide = null;
          this.setStreamingThinking(null);
        }, L);
      else this.setStreamingThinking(null);
    }
  };
  setUserInputOnProcessing = (h, x, D = false) => {
    this._showPromptsOnProcessing(
      h,
      x,
      h !== undefined && h === this._snapshot.userInputOnProcessing
        ? this._snapshot.followingPromptsOnProcessing
        : pendingShellLines,
      D,
    );
  };
  showDrainedPrompts(h, x) {
    this._showPromptsOnProcessing(h.text, h.origin, x.length === 0 ? pendingShellLines : x, true);
  }
  _showPromptsOnProcessing(h, x, D, L) {
    if (h !== undefined) this.placeholderTracker.start(this._getTranscriptLength(), h);
    else this.placeholderTracker.stop();
    let ee = h === undefined ? undefined : x;
    let ke = h !== undefined && L;
    if (
      h === this._snapshot.userInputOnProcessing &&
      ke === this._snapshot.placeholderWaitedInQueue &&
      stableStringifySafe(ee) === stableStringifySafe(this._snapshot.placeholderOrigin) &&
      D.length === this._snapshot.followingPromptsOnProcessing.length &&
      D.every((Re, Be) => {
        let He = this._snapshot.followingPromptsOnProcessing[Be];
        return Re.text === He?.text && stableStringifySafe(Re.origin) === stableStringifySafe(He.origin);
      })
    )
      return;
    this._publish({
      userInputOnProcessing: h,
      placeholderOrigin: ee,
      followingPromptsOnProcessing: D,
      placeholderWaitedInQueue: ke,
    });
  }
  trackTranscriptWrite(h, x) {
    if (this.placeholderTracker.track(h, x) && this._snapshot.userInputOnProcessing !== undefined)
      this._publish({
        userInputOnProcessing: undefined,
        placeholderOrigin: undefined,
        followingPromptsOnProcessing: pendingShellLines,
        placeholderWaitedInQueue: false,
      });
    if (x !== h) this._sweepResolvedToolProgress(x);
  }
  awaitModelFor(h) {
    let flattened = h.filter(isHumanTurnOrQueuedCommand).flatMap((D) => shortUuid(D) ?? []);
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
  emitToolProgress = (h) => {
    let toolProgress = this._snapshot.toolProgress;
    let D = applyToolHint(
      h.kind === "bash_mode_progress"
        ? applyToolHint(toolProgress, {
            kind: "clear",
            toolUseId: DRAINED_SHELL_LINE,
          })
        : toolProgress,
      h,
    );
    if (D === toolProgress) return;
    this._publish({
      toolProgress: D,
    });
  };
  showDrainedShellLine(input, verbose) {
    let D = {
      kind: "bash_mode_progress",
      toolUseId: DRAINED_SHELL_LINE,
      input,
      progress: null,
      verbose,
    };
    this.emitToolProgress(D);
    return () => {
      if (this._snapshot.toolProgress.get(DRAINED_SHELL_LINE) === D)
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
  _sweepResolvedToolProgress(h) {
    let toolProgress = this._snapshot.toolProgress;
    if (toolProgress.size === 0) return;
    let D = new Set();
    for (let ee of h) {
      if (ee.type !== "user" || !Array.isArray(ee.message.content)) continue;
      for (let ke of ee.message.content)
        if (ke.type === "tool_result" && toolProgress.has(ke.tool_use_id)) D.add(ke.tool_use_id);
    }
    let L = dropToolHints(toolProgress, D);
    if (L === toolProgress) return;
    this._publish({
      toolProgress: L,
    });
  }
  get responseLength() {
    return this._responseLength;
  }
  get inFlightMessageId() {
    return this._inFlightMessageId;
  }
  get isMainResponseStreaming() {
    let last = this._apiMetrics.findLast((x) => x.id == null);
    return last !== undefined && last.outputTokens == null;
  }
  get isMainRequestAwaitingResponse() {
    return this._isMainRequestAwaitingResponse;
  }
  noteMainRequestAnnounced = () => {
    this._isMainRequestAwaitingResponse = true;
  };
  addResponseLength = (h) => {
    this._responseLength += h;
    let now = Date.now();
    if (now - this._lastTokenFlushTime >= DRAIN_POLL_MS) {
      this._lastTokenFlushTime = now;
      this._mirrorTiming({
        tokenCount: Math.round(this._responseLength / 4),
      });
    }
    if (h > 0 && this._apiMetrics.length > 0) {
      let last = this._apiMetrics.at(-1);
      if (last.outputTokens == null) {
        last.lastTokenTime = Date.now();
        last.endResponseLength = this._responseLength;
      }
    }
  };
  onResponseLength = (h) => {
    if (h.op === "reset") this._zeroResponseLength();
    else this.addResponseLength(h.delta);
  };
  _zeroResponseLength() {
    if (this._responseLength === 0) return;
    this._responseLength = 0;
    this._mirrorTiming({
      tokenCount: 0,
    });
  }
  recordApiMetricsEvent = (h) => {
    if (h.type === "start" && h.messageId != null) this._inFlightMessageId = h.messageId;
    let x =
      h.type === "thinking_signature" && isReplBridgeActive()
        ? (this._apiMetrics.findLast((D) => D.id == null)?.thinkingTokenEstimate ?? 0)
        : undefined;
    this._responseLength = applyStreamTokenEvent({
      entries: this._apiMetrics,
      responseLength: this._responseLength,
      event: h,
    });
    if (h.type === "thinking_progress" && isReplBridgeActive()) {
      let last = this._apiMetrics.findLast((L) => L.id == null);
      if (last?.thinkingTokenEstimate != null)
        enqueueTaskNotification({
          type: "system",
          subtype: "thinking_tokens",
          estimated_tokens: last.thinkingTokenEstimate,
          estimated_tokens_delta: h.estimatedTokensDelta,
        });
    } else if (x !== undefined) {
      let thinkingTokenEstimate = this._apiMetrics.findLast((L) => L.id == null)?.thinkingTokenEstimate;
      if (thinkingTokenEstimate != null && thinkingTokenEstimate > x)
        enqueueTaskNotification({
          type: "system",
          subtype: "thinking_tokens",
          estimated_tokens: thinkingTokenEstimate,
          estimated_tokens_delta: thinkingTokenEstimate - x,
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
  applyStreamingText = (h) => {
    if (this._disposed) {
      if (h(this._coalescer.peek()) === null) this._coalescer.clear();
      return;
    }
    this._coalescer.apply(h);
  };
  applyTransformedStreamingText = (h) => {
    if (h !== null && h !== "" && !this._isStreamingTextVisible()) return;
    this.previewStore.setTransformed(h);
  };
  applyStreamingRewrite = (h) => {
    if (h !== null && !this._isStreamingTextVisible()) return;
    if (h !== null) this._coalescer.flushNow();
    this.previewStore.setRewrite(h);
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
  _publish(h) {
    this._snapshot = {
      ...this._snapshot,
      ...h,
    };
    try {
      this._changed.emit();
    } catch (error) {
      logError(error);
    }
  }
  _mirrorTiming(h) {
    try {
      this._onTimingChange(h);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-18hwfzwa.js:1510531-1510570 placement
function clearIfAny(h) {
  return h.length > 0 ? [] : h;
}
//@ chunk-18hwfzwa.js:1510570-1510660 placement = buildTranscriptEntries (0.777)
function isHumanTurnOrQueuedCommand(message) {
  return (
    isHumanTurn_2(message) || (message.type === "attachment" && message.attachment.type === "queued_command")
  );
}
export { TranscriptStream };
