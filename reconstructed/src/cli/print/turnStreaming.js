/**
 * cli/print/turnStreaming.ts
 *
 * 2.1.316 新增：headless 轮次的首字计时、MessageDisplay 钩子与消息列表增量更新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (20), chunk-e6aww6q8.js (1)
 * attribution: placement 21
 */
import { randomUUID } from "crypto";
import { open } from "fs/promises";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../utils/hooks/hookEvents.js";
import {
  createBaseHookInput,
  hookInputCwd,
  executeHooks,
  hasHookForEvent,
  hasSettingsHookForEvent,
} from "../../utils/hooks.js";
import {
  isRealAssistantReply,
  hasNonWhitespace,
  RESUME_NOTIFICATION_MAX_AGE_MS,
  BRIEF_TOOL_NAME_SET,
} from "./resumeMcpTasks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import {
  stripMemoryTags as stripMemoryTags_2,
  measureMemoryTags,
  classifyCitedMemories,
  stripMemoryTagsFromBlocks,
  withCitationsDropped,
} from "../../services/orgMemory/promptIndex.js";
import { isClassicEventAdmitted } from "../../plugins/functionHooks/toolCallHooks.js";
import { claudeMdAccessTrackerSlot } from "../../utils/instructionFileAccess.js";
import { upsertMessageByUuid, getContentText } from "../../utils/messages.js";
import { eventCallersWrapper2 } from "../../plugins/functionHooks/eventCatalog.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import { setClassifierChecking } from "../../utils/classifierApprovals.js";
import { resolvePromptEntryWaiters } from "../../utils/processUserInput/promptEntryWaiters.js";
import { submitMarks } from "../../plugins/functionHooks/promptSubmit.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import {
  isRemoteEgressSuppressedFor,
  pinSessionId,
  getTranscriptPathForSession,
} from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:3422713-3423077 placement
/**
 * 执行 MessageDisplay 钩子（316 新增）：输入 turn_id/message_id/index/final/delta，强制同步、关闭逐次遥测；钩子可返回 displayContent 替换屏幕显示。
 */
async function* executeMessageDisplayHooks(
  session,
  options,
  sessionHooks,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  storageV5,
  credentials,
) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "MessageDisplay",
    turn_id: options.turnId,
    message_id: options.messageId,
    index: options.index,
    final: options.final,
    delta: options.delta,
  };
  yield* executeHooks({
    session,
    hookInput,
    toolUseID: `${options.messageId}-${options.index}`,
    signal,
    timeoutMs,
    sessionHooks,
    forceSyncExecution: true,
    suppressPerInvocationTelemetry: true,
    storageV5,
    credentials,
  });
}
//@ chunk-0sfjpx19.js:79975-80163 placement = countToolCallsSince (1)
function collectReadNotificationsToolUseIds(messages, sinceUuid) {
  if (!isRealAssistantReply(messages)) return false;
  let { content } = messages.message;
  if (typeof content === "string") return hasNonWhitespace(content);
  return content.some(
    (block) =>
      (block.type === "text" && hasNonWhitespace(block.text)) ||
      (block.type === "tool_use" && sinceUuid?.has(block.name) === true),
  );
}
//@ chunk-0sfjpx19.js:80163-80243 placement
function isToolUseBlockType(type) {
  return type === "tool_use" || type === "server_tool_use" || type === "mcp_tool_use";
}
//@ chunk-0sfjpx19.js:80243-83013 placement
/**
 * 记录查询链首段文本到达时间（tengu_turn_first_text），区分用户等待。
 */
function createFirstTextTimer({
  queryChainId,
  observesUserWait,
  promptTiming,
  textToolNames,
  now = () => performance.now(),
  schedule = (fn, delayMs) => {
    let timer = setTimeout(fn, delayMs);
    timer.unref?.();
    return () => clearTimeout(timer);
  },
}) {
  let startedAt = now();
  let requestSentAtMs;
  let hadRequestSentAt = false;
  let messageId;
  let byMessageId = new Map();
  let requestCount = 0;
  let toolCallCount = 0;
  let painted;
  let settled = false;
  let userWaits = [];
  let cancelCap = schedule(() => settle("cap", undefined), RESUME_NOTIFICATION_MAX_AGE_MS);
  function runSafely(label, fn) {
    try {
      fn();
    } catch (error) {
      logForDebugging(`tengu_turn_first_text: ${label} failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function userWaitMs(fromMs, toMs) {
    let ms = 0;
    let count = 0;
    for (let wait of userWaits) {
      let overlapMs = Math.min(wait.toMs ?? toMs, toMs) - Math.max(wait.fromMs, fromMs);
      if (overlapMs > 0) {
        ms += overlapMs;
        count += 1;
      }
    }
    return {
      ms,
      count,
    };
  }
  function settle(reason, terminalReason) {
    if (settled) return;
    settled = true;
    cancelCap();
    let firstAt = requestSentAtMs ?? startedAt;
    let endAt = painted?.atMs ?? now();
    let max = Math.max(0, Math.round(endAt - firstAt));
    let waited = userWaitMs(firstAt, endAt);
    let meta = painted && byMessageId.get(painted.messageId);
    let toolCallsBefore = meta?.toolCallsBefore ?? painted?.toolCallsBefore ?? 0;
    try {
      logEvent("tengu_turn_first_text", {
        first_text_wait_end: fromEnum(painted ? "painted" : reason),
        ...(painted && {
          ttfvt_first_text_paint_ms: max,
          first_text_path: fromEnum(toolCallsBefore > 0 ? "after_tool_use" : "direct"),
          requests_before_first_text: meta?.order ?? painted.order,
          tool_calls_before_first_text: toolCallsBefore,
          first_text_assistant_message_id: sanitizeMarkName(painted.messageId),
          first_text_request_id: sanitizeMarkName(meta?.requestId),
          first_text_render_path: fromEnum(painted.renderPath),
        }),
        ...(observesUserWait && {
          user_wait_before_first_text_ms: Math.min(Math.round(waited.ms), max),
          user_waits_before_first_text: waited.count,
        }),
        queryChainId: sanitizeMarkName(queryChainId),
        terminal_reason: fromEnumOpt(painted ? undefined : terminalReason),
        ...(promptTiming &&
          hadRequestSentAt &&
          requestSentAtMs !== undefined && {
            prompt_submit_to_send_ms: Math.max(0, Math.round(requestSentAtMs - promptTiming.submittedAtMs)),
            prompt_queued_ms: Math.max(0, Math.round(promptTiming.dequeuedAtMs - promptTiming.submittedAtMs)),
          }),
      });
    } catch (error) {
      logForDebugging(`tengu_turn_first_text: analytics sink threw, event dropped: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function onAssistant(message) {
    if (settled || !isRealAssistantReply(message)) return;
    let { message: message_2, requestId } = message;
    let meta = byMessageId.get(message_2.id) ?? {};
    byMessageId.set(message_2.id, meta);
    meta.requestId ??= requestId ?? undefined;
    if (
      meta.order === undefined &&
      (typeof message_2.content === "string" ||
        message_2.content.some((block) => block.type !== "thinking" && block.type !== "redacted_thinking"))
    ) {
      requestCount += 1;
      meta.order = requestCount;
    }
    if (typeof message_2.content === "string") meta.toolCallsBefore ??= toolCallCount;
    else
      for (let block of message_2.content)
        if (
          (block.type === "text" && hasNonWhitespace(block.text)) ||
          (block.type === "tool_use" && textToolNames?.has(block.name) === true)
        )
          meta.toolCallsBefore ??= toolCallCount;
        else if (isToolUseBlockType(block.type)) toolCallCount += 1;
    if (painted !== undefined && painted.messageId === message_2.id) settle("painted", undefined);
  }
  return {
    onStreamEvent({ event, requestSentAtMs: requestSentAtMs_2 }) {
      runSafely("stream event", () => {
        if (settled || event.type !== "message_start") return;
        if (requestSentAtMs === undefined) {
          requestSentAtMs = requestSentAtMs_2 ?? startedAt;
          hadRequestSentAt = requestSentAtMs_2 !== undefined;
        }
        if (painted !== undefined && painted.messageId !== event.message.id) {
          settle("painted", undefined);
          return;
        }
        messageId = event.message.id;
      });
    },
    onAssistantMessage(message) {
      runSafely("assistant message", () => onAssistant(message));
    },
    setUserWaiting(waiting) {
      runSafely("user wait", () => {
        if (settled) return;
        let last = userWaits.at(-1);
        if (waiting && (last === undefined || last.toMs !== undefined))
          userWaits.push({
            fromMs: now(),
            toMs: undefined,
          });
        else if (!waiting && last !== undefined && last.toMs === undefined) last.toMs = now();
      });
    },
    markFirstTextPainted(renderPath, paintedMessageId) {
      runSafely("paint stamp", () => {
        if (settled || painted) return;
        let newMessageId = paintedMessageId ?? messageId;
        if (newMessageId === undefined) return;
        let meta = byMessageId.get(newMessageId);
        painted = {
          atMs: now(),
          messageId: newMessageId,
          order: meta?.order ?? requestCount + 1,
          toolCallsBefore: meta?.toolCallsBefore ?? toolCallCount,
          renderPath,
        };
        if (meta) settle("painted", undefined);
      });
    },
    end(terminalReason, interrupted = isAbortedTerminalReason(terminalReason)) {
      runSafely("settle", () => settle(interrupted ? "interrupted" : "no_text", terminalReason));
    },
  };
}
//@ chunk-0sfjpx19.js:83013-83330 placement
/**
 * 为一轮无头查询开始计时：生成查询链 id，创建首段文本计时器，并订阅会话的"等待用户决定"状态以暂停计时；dispose 时取消订阅。
 */
function startTurnTiming({ toolUseContext, sessionState }) {
  let chainId = randomUUID();
  toolUseContext.queryTracking = {
    chainId,
    depth: -1,
  };
  let firstTextTimer = createFirstTextTimer({
    queryChainId: chainId,
    observesUserWait: sessionState !== undefined,
    textToolNames: BRIEF_TOOL_NAME_SET,
  });
  firstTextTimer.setUserWaiting(sessionState?.userDecisionPending ?? false);
  let unsubscribe = sessionState?.userDecisionPendingChanged.subscribe((waiting) =>
    firstTextTimer.setUserWaiting(waiting),
  );
  return {
    ...firstTextTimer,
    dispose() {
      unsubscribe?.();
    },
  };
}
//@ chunk-0sfjpx19.js:83367-83400 placement
var HOOK_MESSAGE_RATE_PER_SEC = 10;
var HOOK_MESSAGE_MAX_PER_SEC = 1000 / HOOK_MESSAGE_RATE_PER_SEC;
var MAX_CONCURRENT_HOOK_MESSAGES = 3;
var HOOK_MESSAGE_TIMEOUT_MS = 1e4;
//@ chunk-0sfjpx19.js:83400-86729 placement
/**
 * 把钩子附件（非阻塞错误、取消等）转换为 SDK 输出消息。
 */
function collectHookAttachmentMessages({
  session,
  sessionHooks,
  onStreamingDisplay,
  onStreamingRewrite,
  onMessageDisplay,
  storageV5,
  credentials,
}) {
  let turnId = randomUUID();
  let currentFrame = null;
  function dispatchFrame(frame) {
    if (frame.abandoned) return;
    if (frame.isLive) {
      dispatchRewrite(frame);
      return;
    }
    if (frame.done) onMessageDisplay(frame.apiMessageId, frame.output);
    else onStreamingDisplay(frame.output);
  }
  function dispatchRewrite(frame) {
    if (!frame.isRewritten) return;
    if (!frame.done) {
      onStreamingRewrite({
        original: frame.raw.slice(0, frame.resolvedOffset),
        text: frame.output,
      });
      return;
    }
    onMessageDisplay(
      frame.apiMessageId,
      frame.output + stripMemoryTags_2(frame.raw.slice(frame.resolvedOffset)),
    );
    if (!frame.finalized) {
      onStreamingRewrite(null);
      onStreamingDisplay("");
    }
  }
  function flushDelta(frame, index, final, rawDelta, resolvedOffset) {
    frame.inFlight++;
    let now = Date.now();
    let hookRun = (async () => {
      let displayText = rawDelta;
      try {
        for await (let hookResult of executeMessageDisplayHooks(
          session,
          {
            turnId: frame.turnId,
            messageId: frame.messageId,
            index,
            final,
            delta: rawDelta,
          },
          sessionHooks,
          frame.abortController.signal,
          HOOK_MESSAGE_TIMEOUT_MS,
          storageV5,
          credentials,
        )) {
          if (
            hookResult.message?.type === "attachment" &&
            (hookResult.message.attachment.type === "hook_non_blocking_error" ||
              hookResult.message.attachment.type === "hook_cancelled")
          )
            frame.stats.errorCount++;
          if (hookResult.displayContent !== undefined) displayText = hookResult.displayContent;
        }
      } catch (error) {
        frame.stats.errorCount++;
        logForDebugging(
          `MessageDisplay hook flush ${index} failed; displaying original delta: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      } finally {
        let elapsedMs = Date.now() - now;
        frame.stats.totalDurationMs += elapsedMs;
        frame.stats.maxDurationMs = Math.max(frame.stats.maxDurationMs, elapsedMs);
        frame.inFlight--;
        settleFrame(frame);
      }
      return displayText;
    })();
    frame.appendChain = frame.appendChain.then(async () => {
      let appliedText = await hookRun;
      frame.output += appliedText;
      frame.resolvedOffset = resolvedOffset;
      frame.isRewritten ||= appliedText !== rawDelta;
      dispatchFrame(frame);
    });
  }
  function settleFrame(frame) {
    if (frame.abandoned) return;
    if (frame.finalized) {
      if (!frame.finalDispatched) flushFrame(frame, true);
      else if (frame.inFlight === 0 && !frame.stats.summaryEmitted) {
        frame.stats.summaryEmitted = true;
        logEvent("tengu_message_display_hooks", {
          flushCount: frame.index,
          errorCount: frame.stats.errorCount,
          totalDurationMs: frame.stats.totalDurationMs,
          maxDurationMs: frame.stats.maxDurationMs,
        });
      }
      return;
    }
    scheduleFlush(frame);
  }
  function flushFrame(frame, final) {
    if (frame.flushTimer !== null) {
      clearTimeout(frame.flushTimer);
      frame.flushTimer = null;
    }
    if (frame.inFlight >= MAX_CONCURRENT_HOOK_MESSAGES) return;
    let resolvedOffset = final
      ? frame.raw.length
      : frame.raw.lastIndexOf(`
`) + 1;
    let sliced = frame.raw.slice(frame.flushedOffset, resolvedOffset);
    if (!final && sliced === "") return;
    if (final) frame.finalDispatched = true;
    frame.flushedOffset = resolvedOffset;
    frame.lastFlushAt = Date.now();
    let index = frame.index;
    frame.index++;
    flushDelta(frame, index, final, stripMemoryTags_2(sliced), resolvedOffset);
  }
  function scheduleFlush(frame) {
    if (frame.flushTimer !== null) return;
    if (frame.inFlight >= MAX_CONCURRENT_HOOK_MESSAGES) return;
    if (
      frame.raw.lastIndexOf(`
`) +
        1 <=
      frame.flushedOffset
    )
      return;
    let sinceLastFlushMs = Date.now() - frame.lastFlushAt;
    if (sinceLastFlushMs >= HOOK_MESSAGE_MAX_PER_SEC) {
      flushFrame(frame, false);
      return;
    }
    frame.flushTimer = setTimeout(
      (frame, flush) => {
        frame.flushTimer = null;
        if (!frame.finalized && !frame.abandoned) flush(frame, false);
      },
      HOOK_MESSAGE_MAX_PER_SEC - sinceLastFlushMs,
      frame,
      flushFrame,
    );
  }
  function abandonFrame(frame) {
    frame.abandoned = true;
    if (frame.flushTimer !== null) {
      clearTimeout(frame.flushTimer);
      frame.flushTimer = null;
    }
    frame.abortController.abort();
  }
  return {
    newTurn() {
      if (currentFrame && !currentFrame.finalized) abandonFrame(currentFrame);
      currentFrame = null;
      turnId = randomUUID();
    },
    begin(apiMessageId) {
      if (currentFrame && !currentFrame.finalized) abandonFrame(currentFrame);
      onStreamingRewrite(null);
      if (!hasHookForEvent("MessageDisplay", sessionHooks, session.id)) {
        currentFrame = null;
        onStreamingDisplay(null);
        return;
      }
      let isLive =
        !hasSettingsHookForEvent("MessageDisplay", sessionHooks, session.id) &&
        !isClassicEventAdmitted("MessageDisplay");
      currentFrame = {
        apiMessageId,
        messageId: randomUUID(),
        turnId,
        raw: "",
        flushedOffset: 0,
        index: 0,
        output: "",
        isLive,
        resolvedOffset: 0,
        isRewritten: false,
        appendChain: Promise.resolve(),
        lastFlushAt: 0,
        flushTimer: null,
        inFlight: 0,
        abortController: new AbortController(),
        finalized: false,
        finalDispatched: false,
        done: false,
        abandoned: false,
        stats: {
          totalDurationMs: 0,
          maxDurationMs: 0,
          errorCount: 0,
          summaryEmitted: false,
        },
      };
      onStreamingDisplay(isLive ? null : "");
    },
    delta(delta) {
      if (currentFrame === null || currentFrame.finalized) return;
      currentFrame.raw += delta;
      scheduleFlush(currentFrame);
    },
    entryLanded(entry) {
      stripMemoryTags(claudeMdAccessTrackerSlot.of(session), entry, "repl");
      let frame = currentFrame;
      if (frame === null || frame.apiMessageId !== entry.message.id) return;
      if (frame.raw === "" || !entry.message.content.some((block) => block.type === "text")) return;
      frame.done = true;
      dispatchFrame(frame);
      if (!frame.isLive) onStreamingDisplay("");
    },
    finalize() {
      let frame = currentFrame;
      if (frame === null) return;
      frame.finalized = true;
      currentFrame = null;
      onStreamingDisplay(null);
      onStreamingRewrite(null);
      if (frame.raw === "" && frame.index === 0) return;
      frame.done = true;
      flushFrame(frame, true);
      dispatchFrame(frame);
    },
  };
}
//@ chunk-0sfjpx19.js:86729-87619 placement
/**
 * 去掉助手文本中的记忆标签（tengu_cc_memory_tag_stripped）。
 */
function stripMemoryTags(tracker, message, surface) {
  for (let block of message.message.content) {
    let source =
      block.type === "text"
        ? {
            name: "text",
            source: block.text,
          }
        : block.type === "thinking"
          ? {
              name: "thinking",
              source: block.thinking,
            }
          : null;
    if (source === null) continue;
    let tags = measureMemoryTags(source.source);
    if (tags.openTagCount === 0 && tags.closeTagCount === 0) continue;
    let citations = classifyCitedMemories(source.source, (path) => tracker.citedStatus(path));
    logEvent("tengu_cc_memory_tag_stripped", {
      surface: fromEnum(source.name),
      seam: fromEnum(surface),
      open_tag_count: tags.openTagCount,
      close_tag_count: tags.closeTagCount,
      tagged_content_chars: tags.taggedContentChars,
      block_chars: source.source.length,
      memory_file_count: tags.memoryFileCount,
      missing_filenames_attr: tags.missingFilenamesAttr,
      open_tag_chars_bucket: tags.openTagCharsBucket,
      cited_resolved_count: citations.resolved,
      cited_unknown_count: citations.unknown,
      cited_read_count: citations.read,
      cited_written_count: citations.written,
      cited_injected_body_count: citations.injectedBody,
      cited_surfaced_count: citations.surfaced,
      cited_listed_count: citations.listed,
      request_id: sanitizeMarkName(message.requestId),
      messageID: sanitizeMarkName(message.message.id),
    });
  }
}
//@ chunk-0sfjpx19.js:87619-87926 placement
/**
 * 清理 displayedMessageContent：只保留仍存在于消息列表中的助手消息 id 对应的条目，无变化时返回原状态。
 */
function pruneDisplayedContent(conversation, snapshot) {
  if (Object.keys(conversation.displayedMessageContent).length === 0) return conversation;
  let liveIds = new Set();
  for (let message of snapshot) if (message.type === "assistant") liveIds.add(message.message.id);
  let kept = {};
  let droppedAny = false;
  for (let [key, value] of Object.entries(conversation.displayedMessageContent))
    if (liveIds.has(key)) kept[key] = value;
    else droppedAny = true;
  if (!droppedAny) return conversation;
  return {
    ...conversation,
    displayedMessageContent: kept,
  };
}
//@ chunk-0sfjpx19.js:87926-88741 placement
/**
 * 对完成的消息运行 MessageDisplay 钩子，失败时输出原消息。
 */
async function runMessageDisplayHook(session, message, turnId, sessionHooks, signal, storageV5, credentials) {
  stripMemoryTags(claudeMdAccessTrackerSlot.of(session), message, "sdk");
  let strippedContent = stripMemoryTagsFromBlocks(message.message.content);
  let stripped =
    strippedContent === message.message.content
      ? message
      : {
          ...message,
          message: {
            ...message.message,
            content: strippedContent,
          },
        };
  let result = {
    message: stripped,
    hookOutputApplied: false,
  };
  if (!hasHookForEvent("MessageDisplay", sessionHooks, session.id)) return result;
  let joined = stripped.message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  if (joined === "") return result;
  let hookText;
  try {
    for await (let hookResult of executeMessageDisplayHooks(
      session,
      {
        turnId,
        messageId: randomUUID(),
        index: 0,
        final: true,
        delta: joined,
      },
      sessionHooks,
      signal,
      HOOK_MESSAGE_TIMEOUT_MS,
      storageV5,
      credentials,
    ))
      if (hookResult.displayContent !== undefined) hookText = hookResult.displayContent;
  } catch (error) {
    logForDebugging(
      `MessageDisplay hook failed for completed message; emitting original text: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return result;
  }
  if (hookText === undefined) return result;
  let firstText = true;
  return {
    hookOutputApplied: true,
    message: {
      ...stripped,
      message: {
        ...stripped.message,
        content: stripped.message.content.map((block) => {
          if (block.type !== "text") return block;
          let replacement = firstText ? hookText : "";
          firstText = false;
          return withCitationsDropped(block, replacement);
        }),
      },
    },
  };
}
//@ chunk-0sfjpx19.js:88741-88752 placement
var MAX_PROGRESS_ROWS_REPLACED = 200;
//@ chunk-0sfjpx19.js:88752-89280 placement
function applyMessageListAppend(patch, commit) {
  switch (patch.type) {
    case "append":
      return {
        rows: patch.messages,
        keep: (messages) =>
          commit({
            type: "append",
            messages: [...messages],
          }),
      };
    case "append-or-move-by-uuid":
      return {
        rows: [patch.message],
        keep: (messages) => {
          for (let message of messages)
            commit({
              type: "append-or-move-by-uuid",
              message,
            });
        },
      };
    case "replace-by-uuid":
      return {
        rows: [patch.message],
        keep: (messages) => {
          for (let message of messages)
            commit({
              type: "replace-by-uuid",
              uuid: patch.uuid,
              message,
            });
        },
      };
    case "insert-after-uuid": {
      let uuid = patch.uuid;
      return {
        rows: patch.messages,
        keep: (messages) => {
          commit({
            type: "insert-after-uuid",
            uuid,
            messages: [...messages],
          });
          uuid = messages.at(-1)?.uuid ?? uuid;
        },
      };
    }
    default:
      return;
  }
}
//@ chunk-0sfjpx19.js:89280-90278 placement
/**
 * 按 append/replace-all/remove-by-uuid 等操作更新消息列表。
 */
function applyMessageListEdit(messages, patch) {
  switch (patch.type) {
    case "append":
      return patch.messages.length === 0 ? messages : [...messages, ...patch.messages];
    case "replace-all":
      return patch.messages;
    case "remove-by-uuid": {
      let index = messages.findIndex((message) => message.uuid === patch.uuid);
      if (index === -1) return messages;
      let sliced = messages.slice();
      sliced.splice(index, 1);
      return sliced;
    }
    case "replace-by-uuid": {
      let index = messages.findIndex((message) => message.uuid === patch.uuid);
      return index === -1 ? [...messages, patch.message] : messages.with(index, patch.message);
    }
    case "insert-after-uuid": {
      let index = messages.findIndex((message) => message.uuid === patch.uuid);
      if (index === -1 || patch.messages.length === 0) return messages;
      let sliced = messages.slice();
      sliced.splice(index + 1, 0, ...patch.messages);
      return sliced;
    }
    case "replace-last-ephemeral-progress": {
      let max = Math.max(0, messages.length - MAX_PROGRESS_ROWS_REPLACED);
      let data = patch.message.data;
      for (let j = messages.length - 1; j >= max; j--) {
        let row = messages[j];
        if (row?.type !== "progress") break;
        let rowData = row.data;
        if (row.parentToolUseID === patch.message.parentToolUseID && rowData.type === data.type)
          return messages.with(j, patch.message);
      }
      return [...messages, patch.message];
    }
    case "append-or-move-by-uuid":
      return upsertMessageByUuid(messages, patch.message);
    case "remove-uuids-and-append":
      return [...messages.filter((message) => !patch.excludeUuids.has(message.uuid)), patch.message];
    case "update":
      return patch.updater(messages);
  }
}
//@ chunk-0sfjpx19.js:90315-90814 placement
function describeDroppedNotes(deliver) {
  let resolved = Promise.resolve();
  let generation = 0;
  let severCount = 0;
  let severedAt = -1;
  return {
    enqueue(label, run) {
      let queuedGeneration = generation;
      let queuedSeverCount = severCount;
      resolved = resolved
        .then(() => {
          if (queuedSeverCount <= severedAt) {
            logForDebugging(
              `${label}: not dispatched, the tail was severed while it waited behind an event that never settled`,
            );
            return [];
          }
          return run();
        })
        .then((notes) => {
          if (notes.length === 0) return;
          if (queuedGeneration !== generation) {
            logForDebugging(
              `${label}: ${notes.length} note(s) dropped, the conversation was reset while it ran (${queuedGeneration} to ${generation})`,
            );
            return;
          }
          deliver(notes);
        })
        .catch((error) => logForDebugging(`${label} failed: ${errorMessage(error)}`));
    },
    reset: () => {
      generation += 1;
    },
    settled: () => resolved,
    sever: () => {
      generation += 1;
      severedAt = severCount;
      severCount += 1;
      resolved = Promise.resolve();
    },
  };
}
//@ chunk-0sfjpx19.js:90814-90910 placement
/**
 * 创建回合流桥接：包装 describeDroppedNotes 提供 begin/enqueue/settled/sever。
 */
function createTurnStreamBridge(deliver) {
  let droppedNotes = describeDroppedNotes(deliver);
  return {
    begin: randomUUID,
    enqueue: droppedNotes.enqueue,
    settled: droppedNotes.settled,
    sever: droppedNotes.sever,
  };
}
//@ chunk-0sfjpx19.js:90910-91367 placement
function buildTurnStartEvent(turnStart) {
  let { newMessages, input, signal, abort } = turnStart;
  let last = newMessages.findLast((newMessage) => newMessage.type === "user" && !newMessage.isMeta);
  let lastIsUser = last && last.type === "user";
  let text = (lastIsUser ? getContentText(last.message.content) : null) ?? input ?? "";
  let turnEvents = turnStart.turnEvents.begin();
  let deferred = Promise.withResolvers();
  let eventCallers = eventCallersWrapper2({
    signal,
  });
  turnStart.turnEvents.enqueue("turn.start", () =>
    eventCallers.turn
      .start({
        text,
        turnId: turnEvents,
      })
      .then(() => [])
      .finally(deferred.resolve),
  );
  let isUserTurn = lastIsUser === true && isHumanOrUnset(last.origin);
  setClassifierChecking({
    turnId: turnEvents,
    abort,
    started: deferred.promise,
    startedBy: isUserTurn ? "person" : "automatic",
  });
  resolvePromptEntryWaiters(newMessages);
  return turnEvents;
}
//@ chunk-0sfjpx19.js:91367-91596 placement
function abortTurnSignal(messageQueue, signal) {
  submitMarks.prune(messageQueue.getCommandQueue());
  return new Promise((resolve) => {
    let isSettled = () =>
      submitMarks.isAnyAside() || messageQueue.peek((queued) => submitMarks.has(queued.uuid)) !== undefined;
    if (isSettled()) {
      resolve();
      return;
    }
    signal.addEventListener(
      "abort",
      messageQueue.subscribe(() => {
        if (isSettled()) resolve();
      }),
      {
        once: true,
      },
    );
  });
}
//@ chunk-0sfjpx19.js:91596-91655 placement
/**
 * 安装远程出站抑制器：按当前会话 id 判断是否抑制远程出站。
 */
function installRemoteEgressSuppressor() {
  bridgeHostState().remoteEgressSuppressed = () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId()));
}
//@ chunk-0sfjpx19.js:91691-91738 placement
var MAX_ARTIFACT_COMMENT_TRANSCRIPT_BYTES = 8388608;
var ARTIFACT_COMMENT_MONITOR_NAME = '"artifact-comment-monitor"';
//@ chunk-0sfjpx19.js:91738-91827 placement
/**
 * 取会话轻量 transcript 的文件大小（文件不存在返回 undefined）。
 */
async function transcriptFileSize(sessionId) {
  let transcriptPathForSession = getTranscriptPathForSession(sessionId);
  let size = await fileSizeOrUndefined(transcriptPathForSession);
  return size === undefined
    ? undefined
    : {
        path: transcriptPathForSession,
        size,
      };
}
//@ chunk-0sfjpx19.js:91827-91945 placement
async function fileSizeOrUndefined(transcriptPathForSession) {
  try {
    let handle = await open(transcriptPathForSession, "r");
    try {
      return (await handle.stat()).size;
    } finally {
      await handle.close();
    }
  } catch {
    return;
  }
}
export {
  describeDroppedNotes,
  MAX_ARTIFACT_COMMENT_TRANSCRIPT_BYTES,
  ARTIFACT_COMMENT_MONITOR_NAME,
  applyMessageListAppend,
  applyMessageListEdit,
  pruneDisplayedContent,
  installRemoteEgressSuppressor,
  transcriptFileSize,
  createTurnStreamBridge,
  abortTurnSignal,
  startTurnTiming,
  buildTurnStartEvent,
  runMessageDisplayHook,
  collectReadNotificationsToolUseIds,
  collectHookAttachmentMessages,
  createFirstTextTimer,
};
