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
import {
  hasHookForEvent,
  hasSettingsHookForEvent,
  createBaseHookInput,
  hookInputCwd,
  executeHooks,
} from "../../utils/hooks.js";
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
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../utils/hooks/hookEvents.js";

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
  schedule = (_, b) => {
    let timer = setTimeout(_, b);
    timer.unref?.();
    return () => clearTimeout(timer);
  },
}) {
  let _ = now();
  let b;
  let k = false;
  let w;
  let S = new Map();
  let T = 0;
  let D = 0;
  let E;
  let N = false;
  let G = [];
  let R = schedule(() => L("cap", undefined), RESUME_NOTIFICATION_MAX_AGE_MS);
  function P(te, Q) {
    try {
      Q();
    } catch (error) {
      logForDebugging(`tengu_turn_first_text: ${te} failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function U(te, Q) {
    let ms = 0;
    let count = 0;
    for (let V of G) {
      let j = Math.min(V.toMs ?? Q, Q) - Math.max(V.fromMs, te);
      if (j > 0) {
        ms += j;
        count += 1;
      }
    }
    return {
      ms,
      count,
    };
  }
  function L(te, Q) {
    if (N) return;
    N = true;
    R();
    let ne = b ?? _;
    let z = E?.atMs ?? now();
    let max = Math.max(0, Math.round(z - ne));
    let j = U(ne, z);
    let pe = E && S.get(E.messageId);
    let me = pe?.toolCallsBefore ?? E?.toolCallsBefore ?? 0;
    try {
      logEvent("tengu_turn_first_text", {
        first_text_wait_end: fromEnum(E ? "painted" : te),
        ...(E && {
          ttfvt_first_text_paint_ms: max,
          first_text_path: fromEnum(me > 0 ? "after_tool_use" : "direct"),
          requests_before_first_text: pe?.order ?? E.order,
          tool_calls_before_first_text: me,
          first_text_assistant_message_id: sanitizeMarkName(E.messageId),
          first_text_request_id: sanitizeMarkName(pe?.requestId),
          first_text_render_path: fromEnum(E.renderPath),
        }),
        ...(observesUserWait && {
          user_wait_before_first_text_ms: Math.min(Math.round(j.ms), max),
          user_waits_before_first_text: j.count,
        }),
        queryChainId: sanitizeMarkName(queryChainId),
        terminal_reason: fromEnumOpt(E ? undefined : Q),
        ...(promptTiming &&
          k &&
          b !== undefined && {
            prompt_submit_to_send_ms: Math.max(0, Math.round(b - promptTiming.submittedAtMs)),
            prompt_queued_ms: Math.max(0, Math.round(promptTiming.dequeuedAtMs - promptTiming.submittedAtMs)),
          }),
      });
    } catch (error) {
      logForDebugging(`tengu_turn_first_text: analytics sink threw, event dropped: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function oe(te) {
    if (N || !isRealAssistantReply(te)) return;
    let { message, requestId } = te;
    let z = S.get(message.id) ?? {};
    S.set(message.id, z);
    z.requestId ??= requestId ?? undefined;
    if (
      z.order === undefined &&
      (typeof message.content === "string" ||
        message.content.some((V) => V.type !== "thinking" && V.type !== "redacted_thinking"))
    ) {
      T += 1;
      z.order = T;
    }
    if (typeof message.content === "string") z.toolCallsBefore ??= D;
    else
      for (let V of message.content)
        if (
          (V.type === "text" && hasNonWhitespace(V.text)) ||
          (V.type === "tool_use" && textToolNames?.has(V.name) === true)
        )
          z.toolCallsBefore ??= D;
        else if (isToolUseBlockType(V.type)) D += 1;
    if (E !== undefined && E.messageId === message.id) L("painted", undefined);
  }
  return {
    onStreamEvent({ event, requestSentAtMs }) {
      P("stream event", () => {
        if (N || event.type !== "message_start") return;
        if (b === undefined) {
          b = requestSentAtMs ?? _;
          k = requestSentAtMs !== undefined;
        }
        if (E !== undefined && E.messageId !== event.message.id) {
          L("painted", undefined);
          return;
        }
        w = event.message.id;
      });
    },
    onAssistantMessage(te) {
      P("assistant message", () => oe(te));
    },
    setUserWaiting(te) {
      P("user wait", () => {
        if (N) return;
        let last = G.at(-1);
        if (te && (last === undefined || last.toMs !== undefined))
          G.push({
            fromMs: now(),
            toMs: undefined,
          });
        else if (!te && last !== undefined && last.toMs === undefined) last.toMs = now();
      });
    },
    markFirstTextPainted(renderPath, Q) {
      P("paint stamp", () => {
        if (N || E) return;
        let ne = Q ?? w;
        if (ne === undefined) return;
        let z = S.get(ne);
        E = {
          atMs: now(),
          messageId: ne,
          order: z?.order ?? T + 1,
          toolCallsBefore: z?.toolCallsBefore ?? D,
          renderPath,
        };
        if (z) L("painted", undefined);
      });
    },
    end(te, Q = isAbortedTerminalReason(te)) {
      P("settle", () => L(Q ? "interrupted" : "no_text", te));
    },
  };
}
//@ chunk-0sfjpx19.js:83013-83330 placement
/**
 * 为一轮无头查询开始计时：生成查询链 id，创建首段文本计时器，并订阅会话的"等待用户决定"状态以暂停计时；dispose 时取消订阅。
 */
function startTurnTiming({ toolUseContext, sessionState }) {
  let r = randomUUID();
  toolUseContext.queryTracking = {
    chainId: r,
    depth: -1,
  };
  let firstTextTimer = createFirstTextTimer({
    queryChainId: r,
    observesUserWait: sessionState !== undefined,
    textToolNames: BRIEF_TOOL_NAME_SET,
  });
  firstTextTimer.setUserWaiting(sessionState?.userDecisionPending ?? false);
  let h = sessionState?.userDecisionPendingChanged.subscribe((y) => firstTextTimer.setUserWaiting(y));
  return {
    ...firstTextTimer,
    dispose() {
      h?.();
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
  let k = null;
  function w(R) {
    if (R.abandoned) return;
    if (R.isLive) {
      S(R);
      return;
    }
    if (R.done) onMessageDisplay(R.apiMessageId, R.output);
    else onStreamingDisplay(R.output);
  }
  function S(R) {
    if (!R.isRewritten) return;
    if (!R.done) {
      onStreamingRewrite({
        original: R.raw.slice(0, R.resolvedOffset),
        text: R.output,
      });
      return;
    }
    onMessageDisplay(R.apiMessageId, R.output + stripMemoryTags_2(R.raw.slice(R.resolvedOffset)));
    if (!R.finalized) {
      onStreamingRewrite(null);
      onStreamingDisplay("");
    }
  }
  function T(R, index, final, L, resolvedOffset) {
    R.inFlight++;
    let now = Date.now();
    let Q = (async () => {
      let ne = L;
      try {
        for await (let z of executeMessageDisplayHooks(
          session,
          {
            turnId: R.turnId,
            messageId: R.messageId,
            index,
            final,
            delta: L,
          },
          sessionHooks,
          R.abortController.signal,
          HOOK_MESSAGE_TIMEOUT_MS,
          storageV5,
          credentials,
        )) {
          if (
            z.message?.type === "attachment" &&
            (z.message.attachment.type === "hook_non_blocking_error" ||
              z.message.attachment.type === "hook_cancelled")
          )
            R.stats.errorCount++;
          if (z.displayContent !== undefined) ne = z.displayContent;
        }
      } catch (error) {
        R.stats.errorCount++;
        logForDebugging(
          `MessageDisplay hook flush ${index} failed; displaying original delta: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      } finally {
        let z = Date.now() - now;
        R.stats.totalDurationMs += z;
        R.stats.maxDurationMs = Math.max(R.stats.maxDurationMs, z);
        R.inFlight--;
        D(R);
      }
      return ne;
    })();
    R.appendChain = R.appendChain.then(async () => {
      let ne = await Q;
      R.output += ne;
      R.resolvedOffset = resolvedOffset;
      R.isRewritten ||= ne !== L;
      w(R);
    });
  }
  function D(R) {
    if (R.abandoned) return;
    if (R.finalized) {
      if (!R.finalDispatched) E(R, true);
      else if (R.inFlight === 0 && !R.stats.summaryEmitted) {
        R.stats.summaryEmitted = true;
        logEvent("tengu_message_display_hooks", {
          flushCount: R.index,
          errorCount: R.stats.errorCount,
          totalDurationMs: R.stats.totalDurationMs,
          maxDurationMs: R.stats.maxDurationMs,
        });
      }
      return;
    }
    N(R);
  }
  function E(R, final) {
    if (R.flushTimer !== null) {
      clearTimeout(R.flushTimer);
      R.flushTimer = null;
    }
    if (R.inFlight >= MAX_CONCURRENT_HOOK_MESSAGES) return;
    let resolvedOffset = final
      ? R.raw.length
      : R.raw.lastIndexOf(`
`) + 1;
    let sliced = R.raw.slice(R.flushedOffset, resolvedOffset);
    if (!final && sliced === "") return;
    if (final) R.finalDispatched = true;
    R.flushedOffset = resolvedOffset;
    R.lastFlushAt = Date.now();
    let index = R.index;
    R.index++;
    T(R, index, final, stripMemoryTags_2(sliced), resolvedOffset);
  }
  function N(R) {
    if (R.flushTimer !== null) return;
    if (R.inFlight >= MAX_CONCURRENT_HOOK_MESSAGES) return;
    if (
      R.raw.lastIndexOf(`
`) +
        1 <=
      R.flushedOffset
    )
      return;
    let U = Date.now() - R.lastFlushAt;
    if (U >= HOOK_MESSAGE_MAX_PER_SEC) {
      E(R, false);
      return;
    }
    R.flushTimer = setTimeout(
      (L, oe) => {
        L.flushTimer = null;
        if (!L.finalized && !L.abandoned) oe(L, false);
      },
      HOOK_MESSAGE_MAX_PER_SEC - U,
      R,
      E,
    );
  }
  function G(R) {
    R.abandoned = true;
    if (R.flushTimer !== null) {
      clearTimeout(R.flushTimer);
      R.flushTimer = null;
    }
    R.abortController.abort();
  }
  return {
    newTurn() {
      if (k && !k.finalized) G(k);
      k = null;
      turnId = randomUUID();
    },
    begin(apiMessageId) {
      if (k && !k.finalized) G(k);
      onStreamingRewrite(null);
      if (!hasHookForEvent("MessageDisplay", sessionHooks, session.id)) {
        k = null;
        onStreamingDisplay(null);
        return;
      }
      let P =
        !hasSettingsHookForEvent("MessageDisplay", sessionHooks, session.id) &&
        !isClassicEventAdmitted("MessageDisplay");
      k = {
        apiMessageId,
        messageId: randomUUID(),
        turnId,
        raw: "",
        flushedOffset: 0,
        index: 0,
        output: "",
        isLive: P,
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
      onStreamingDisplay(P ? null : "");
    },
    delta(R) {
      if (k === null || k.finalized) return;
      k.raw += R;
      N(k);
    },
    entryLanded(R) {
      stripMemoryTags(claudeMdAccessTrackerSlot.of(session), R, "repl");
      let P = k;
      if (P === null || P.apiMessageId !== R.message.id) return;
      if (P.raw === "" || !R.message.content.some((U) => U.type === "text")) return;
      P.done = true;
      w(P);
      if (!P.isLive) onStreamingDisplay("");
    },
    finalize() {
      let R = k;
      if (R === null) return;
      R.finalized = true;
      k = null;
      onStreamingDisplay(null);
      onStreamingRewrite(null);
      if (R.raw === "" && R.index === 0) return;
      R.done = true;
      E(R, true);
      w(R);
    },
  };
}
//@ chunk-0sfjpx19.js:86729-87619 placement
/**
 * 去掉助手文本中的记忆标签（tengu_cc_memory_tag_stripped）。
 */
function stripMemoryTags(e, n, r) {
  for (let s of n.message.content) {
    let h =
      s.type === "text"
        ? {
            name: "text",
            source: s.text,
          }
        : s.type === "thinking"
          ? {
              name: "thinking",
              source: s.thinking,
            }
          : null;
    if (h === null) continue;
    let y = measureMemoryTags(h.source);
    if (y.openTagCount === 0 && y.closeTagCount === 0) continue;
    let _ = classifyCitedMemories(h.source, (b) => e.citedStatus(b));
    logEvent("tengu_cc_memory_tag_stripped", {
      surface: fromEnum(h.name),
      seam: fromEnum(r),
      open_tag_count: y.openTagCount,
      close_tag_count: y.closeTagCount,
      tagged_content_chars: y.taggedContentChars,
      block_chars: h.source.length,
      memory_file_count: y.memoryFileCount,
      missing_filenames_attr: y.missingFilenamesAttr,
      open_tag_chars_bucket: y.openTagCharsBucket,
      cited_resolved_count: _.resolved,
      cited_unknown_count: _.unknown,
      cited_read_count: _.read,
      cited_written_count: _.written,
      cited_injected_body_count: _.injectedBody,
      cited_surfaced_count: _.surfaced,
      cited_listed_count: _.listed,
      request_id: sanitizeMarkName(n.requestId),
      messageID: sanitizeMarkName(n.message.id),
    });
  }
}
//@ chunk-0sfjpx19.js:87619-87926 placement
/**
 * 清理 displayedMessageContent：只保留仍存在于消息列表中的助手消息 id 对应的条目，无变化时返回原状态。
 */
function pruneDisplayedContent(e, snapshot) {
  if (Object.keys(e.displayedMessageContent).length === 0) return e;
  let r = new Set();
  for (let y of snapshot) if (y.type === "assistant") r.add(y.message.id);
  let s = {};
  let h = false;
  for (let [key, value] of Object.entries(e.displayedMessageContent))
    if (r.has(key)) s[key] = value;
    else h = true;
  if (!h) return e;
  return {
    ...e,
    displayedMessageContent: s,
  };
}
//@ chunk-0sfjpx19.js:87926-88741 placement
/**
 * 对完成的消息运行 MessageDisplay 钩子，失败时输出原消息。
 */
async function runMessageDisplayHook(session, n, turnId, sessionHooks, signal, storageV5, credentials) {
  stripMemoryTags(claudeMdAccessTrackerSlot.of(session), n, "sdk");
  let b = stripMemoryTagsFromBlocks(n.message.content);
  let k =
    b === n.message.content
      ? n
      : {
          ...n,
          message: {
            ...n.message,
            content: b,
          },
        };
  let w = {
    message: k,
    hookOutputApplied: false,
  };
  if (!hasHookForEvent("MessageDisplay", sessionHooks, session.id)) return w;
  let joined = k.message.content.map((E) => (E.type === "text" ? E.text : "")).join("");
  if (joined === "") return w;
  let T;
  try {
    for await (let E of executeMessageDisplayHooks(
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
      if (E.displayContent !== undefined) T = E.displayContent;
  } catch (error) {
    logForDebugging(
      `MessageDisplay hook failed for completed message; emitting original text: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return w;
  }
  if (T === undefined) return w;
  let D = true;
  return {
    hookOutputApplied: true,
    message: {
      ...k,
      message: {
        ...k.message,
        content: k.message.content.map((E) => {
          if (E.type !== "text") return E;
          let N = D ? T : "";
          D = false;
          return withCitationsDropped(E, N);
        }),
      },
    },
  };
}
//@ chunk-0sfjpx19.js:88741-88752 placement
var MAX_PROGRESS_ROWS_REPLACED = 200;
//@ chunk-0sfjpx19.js:88752-89280 placement
function applyMessageListAppend(e, n) {
  switch (e.type) {
    case "append":
      return {
        rows: e.messages,
        keep: (r) =>
          n({
            type: "append",
            messages: [...r],
          }),
      };
    case "append-or-move-by-uuid":
      return {
        rows: [e.message],
        keep: (r) => {
          for (let message of r)
            n({
              type: "append-or-move-by-uuid",
              message,
            });
        },
      };
    case "replace-by-uuid":
      return {
        rows: [e.message],
        keep: (r) => {
          for (let message of r)
            n({
              type: "replace-by-uuid",
              uuid: e.uuid,
              message,
            });
        },
      };
    case "insert-after-uuid": {
      let uuid = e.uuid;
      return {
        rows: e.messages,
        keep: (s) => {
          n({
            type: "insert-after-uuid",
            uuid,
            messages: [...s],
          });
          uuid = s.at(-1)?.uuid ?? uuid;
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
function applyMessageListEdit(e, n) {
  switch (n.type) {
    case "append":
      return n.messages.length === 0 ? e : [...e, ...n.messages];
    case "replace-all":
      return n.messages;
    case "remove-by-uuid": {
      let index = e.findIndex((h) => h.uuid === n.uuid);
      if (index === -1) return e;
      let sliced = e.slice();
      sliced.splice(index, 1);
      return sliced;
    }
    case "replace-by-uuid": {
      let index = e.findIndex((s) => s.uuid === n.uuid);
      return index === -1 ? [...e, n.message] : e.with(index, n.message);
    }
    case "insert-after-uuid": {
      let index = e.findIndex((h) => h.uuid === n.uuid);
      if (index === -1 || n.messages.length === 0) return e;
      let sliced = e.slice();
      sliced.splice(index + 1, 0, ...n.messages);
      return sliced;
    }
    case "replace-last-ephemeral-progress": {
      let max = Math.max(0, e.length - MAX_PROGRESS_ROWS_REPLACED);
      let s = n.message.data;
      for (let j = e.length - 1; j >= max; j--) {
        let y = e[j];
        if (y?.type !== "progress") break;
        let _ = y.data;
        if (y.parentToolUseID === n.message.parentToolUseID && _.type === s.type) return e.with(j, n.message);
      }
      return [...e, n.message];
    }
    case "append-or-move-by-uuid":
      return upsertMessageByUuid(e, n.message);
    case "remove-uuids-and-append":
      return [...e.filter((r) => !n.excludeUuids.has(r.uuid)), n.message];
    case "update":
      return n.updater(e);
  }
}
//@ chunk-0sfjpx19.js:90315-90814 placement
function describeDroppedNotes(e) {
  let resolved = Promise.resolve();
  let r = 0;
  let s = 0;
  let h = -1;
  return {
    enqueue(y, _) {
      let b = r;
      let k = s;
      resolved = resolved
        .then(() => {
          if (k <= h) {
            logForDebugging(
              `${y}: not dispatched, the tail was severed while it waited behind an event that never settled`,
            );
            return [];
          }
          return _();
        })
        .then((w) => {
          if (w.length === 0) return;
          if (b !== r) {
            logForDebugging(
              `${y}: ${w.length} note(s) dropped, the conversation was reset while it ran (${b} to ${r})`,
            );
            return;
          }
          e(w);
        })
        .catch((error) => logForDebugging(`${y} failed: ${errorMessage(error)}`));
    },
    reset: () => {
      r += 1;
    },
    settled: () => resolved,
    sever: () => {
      r += 1;
      h = s;
      s += 1;
      resolved = Promise.resolve();
    },
  };
}
//@ chunk-0sfjpx19.js:90814-90910 placement
/**
 * 创建回合流桥接：包装 describeDroppedNotes 提供 begin/enqueue/settled/sever。
 */
function createTurnStreamBridge(e) {
  let n = describeDroppedNotes(e);
  return {
    begin: randomUUID,
    enqueue: n.enqueue,
    settled: n.settled,
    sever: n.sever,
  };
}
//@ chunk-0sfjpx19.js:90910-91367 placement
function buildTurnStartEvent(e) {
  let { newMessages, input, signal, abort } = e;
  let last = newMessages.findLast((newMessage) => newMessage.type === "user" && !newMessage.isMeta);
  let _ = last && last.type === "user";
  let text = (_ ? getContentText(last.message.content) : null) ?? input ?? "";
  let k = e.turnEvents.begin();
  let deferred = Promise.withResolvers();
  let S = eventCallersWrapper2({
    signal,
  });
  e.turnEvents.enqueue("turn.start", () =>
    S.turn
      .start({
        text,
        turnId: k,
      })
      .then(() => [])
      .finally(deferred.resolve),
  );
  let T = _ === true && isHumanOrUnset(last.origin);
  setClassifierChecking({
    turnId: k,
    abort,
    started: deferred.promise,
    startedBy: T ? "person" : "automatic",
  });
  resolvePromptEntryWaiters(newMessages);
  return k;
}
//@ chunk-0sfjpx19.js:91367-91596 placement
function abortTurnSignal(messageQueue, signal) {
  submitMarks.prune(messageQueue.getCommandQueue());
  return new Promise((resolve) => {
    let s = () => submitMarks.isAnyAside() || messageQueue.peek((h) => submitMarks.has(h.uuid)) !== undefined;
    if (s()) {
      resolve();
      return;
    }
    signal.addEventListener(
      "abort",
      messageQueue.subscribe(() => {
        if (s()) resolve();
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
  let r = await fileSizeOrUndefined(transcriptPathForSession);
  return r === undefined
    ? undefined
    : {
        path: transcriptPathForSession,
        size: r,
      };
}
//@ chunk-0sfjpx19.js:91827-91945 placement
async function fileSizeOrUndefined(transcriptPathForSession) {
  try {
    let n = await open(transcriptPathForSession, "r");
    try {
      return (await n.stat()).size;
    } finally {
      await n.close();
    }
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3422713-3423077 placement
/**
 * 执行 MessageDisplay 钩子（316 新增）：输入 turn_id/message_id/index/final/delta，强制同步、关闭逐次遥测；钩子可返回 displayContent 替换屏幕显示。
 */
async function* executeMessageDisplayHooks(
  e,
  n,
  sessionHooks,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  storageV5,
  credentials,
) {
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "MessageDisplay",
    turn_id: n.turnId,
    message_id: n.messageId,
    index: n.index,
    final: n.final,
    delta: n.delta,
  };
  yield* executeHooks({
    session: e,
    hookInput,
    toolUseID: `${n.messageId}-${n.index}`,
    signal,
    timeoutMs,
    sessionHooks,
    forceSyncExecution: true,
    suppressPerInvocationTelemetry: true,
    storageV5,
    credentials,
  });
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
