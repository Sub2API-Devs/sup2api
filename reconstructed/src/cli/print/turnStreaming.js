/**
 * cli/print/turnStreaming.ts
 *
 * 2.1.316 新增：headless 轮次的首字计时、MessageDisplay 钩子与消息列表增量更新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (20)
 * attribution: placement 20
 */
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { open } from "fs/promises";
import { So, dt, _s, LLt } from "./resumeMcpTasks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import {
  Cb,
  measureMemoryTags,
  classifyCitedMemories,
  stripMemoryTagsFromBlocks,
  withCitationsDropped,
} from "../../services/orgMemory/promptIndex.js";
import { executeMessageDisplayHooks } from "./_new/executeMessageDisplayHooks.js";
import { hasHookForEvent, hasSettingsHookForEvent } from "../../utils/hooks.js";
import { FNi } from "../../plugins/functionHooks/toolCallHooks.js";
import { ICe } from "../../utils/instructionFileAccess.js";
import { upsertMessageByUuid, getContentText } from "../../utils/messages.js";
import { Jue } from "../../plugins/functionHooks/eventCatalog.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import { setClassifierChecking } from "../../utils/classifierApprovals.js";
import { resolvePromptEntryWaiters } from "../../utils/processUserInput/promptEntryWaiters.js";
import { V_e } from "../../plugins/functionHooks/promptSubmit.js";
import { ao } from "../../bridge/bridgeHostState.js";
import {
  isRemoteEgressSuppressedFor,
  pinSessionId,
  getTranscriptPathForSession,
} from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-0sfjpx19.js:79975-80163 placement = countToolCallsSince (1)
function collectReadNotificationsToolUseIds(messages, sinceUuid) {
  if (!So(messages)) return !1;
  let { content: content } = messages.message;
  if (typeof content === "string") return dt(content);
  return content.some(
    (block) =>
      (block.type === "text" && dt(block.text)) ||
      (block.type === "tool_use" && sinceUuid?.has(block.name) === !0),
  );
}
//@ chunk-0sfjpx19.js:80163-80243 placement
function ks(e) {
  return e === "tool_use" || e === "server_tool_use" || e === "mcp_tool_use";
}
/**
 * 记录查询链首段文本到达时间（tengu_turn_first_text），区分用户等待。
 */
//@ chunk-0sfjpx19.js:80243-83013 placement
function createFirstTextTimer({
  queryChainId: queryChainId,
  observesUserWait: observesUserWait,
  promptTiming: promptTiming,
  textToolNames: textToolNames,
  now: now = () => performance.now(),
  schedule: schedule = (_, b) => {
    let k = setTimeout(_, b);
    return (k.unref?.(), () => clearTimeout(k));
  },
}) {
  let _ = now(),
    b,
    k = !1,
    w,
    S = new Map(),
    T = 0,
    D = 0,
    E,
    N = !1,
    G = [],
    R = schedule(() => L("cap", void 0), _s);
  function P(te, Q) {
    try {
      Q();
    } catch (error) {
      logForDebugging(`tengu_turn_first_text: ${te} failed: ${errorMessage(error)}`, { level: "error" });
    }
  }
  function U(te, Q) {
    let ne = 0,
      z = 0;
    for (let V of G) {
      let j = Math.min(V.toMs ?? Q, Q) - Math.max(V.fromMs, te);
      if (j > 0) ((ne += j), (z += 1));
    }
    return { ms: ne, count: z };
  }
  function L(te, Q) {
    if (N) return;
    ((N = !0), R());
    let ne = b ?? _,
      z = E?.atMs ?? now(),
      max = Math.max(0, Math.round(z - ne)),
      j = U(ne, z),
      pe = E && S.get(E.messageId),
      me = pe?.toolCallsBefore ?? E?.toolCallsBefore ?? 0;
    try {
      logEvent("tengu_turn_first_text", {
        first_text_wait_end: fromEnum(E ? "painted" : te),
        ...(E && {
          ttfvt_first_text_paint_ms: max,
          first_text_path: fromEnum(me > 0 ? "after_tool_use" : "direct"),
          requests_before_first_text: pe?.order ?? E.order,
          tool_calls_before_first_text: me,
          first_text_assistant_message_id: ye(E.messageId),
          first_text_request_id: ye(pe?.requestId),
          first_text_render_path: fromEnum(E.renderPath),
        }),
        ...(observesUserWait && {
          user_wait_before_first_text_ms: Math.min(Math.round(j.ms), max),
          user_waits_before_first_text: j.count,
        }),
        queryChainId: ye(queryChainId),
        terminal_reason: fromEnumOpt(E ? void 0 : Q),
        ...(promptTiming &&
          k &&
          b !== void 0 && {
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
    if (N || !So(te)) return;
    let { message: message, requestId: requestId } = te,
      z = S.get(message.id) ?? {};
    if (
      (S.set(message.id, z),
      (z.requestId ??= requestId ?? void 0),
      z.order === void 0 &&
        (typeof message.content === "string" ||
          message.content.some((V) => V.type !== "thinking" && V.type !== "redacted_thinking")))
    )
      ((T += 1), (z.order = T));
    if (typeof message.content === "string") z.toolCallsBefore ??= D;
    else
      for (let V of message.content)
        if ((V.type === "text" && dt(V.text)) || (V.type === "tool_use" && textToolNames?.has(V.name) === !0))
          z.toolCallsBefore ??= D;
        else if (ks(V.type)) D += 1;
    if (E !== void 0 && E.messageId === message.id) L("painted", void 0);
  }
  return {
    onStreamEvent({ event: te, requestSentAtMs: Q }) {
      P("stream event", () => {
        if (N || te.type !== "message_start") return;
        if (b === void 0) ((b = Q ?? _), (k = Q !== void 0));
        if (E !== void 0 && E.messageId !== te.message.id) {
          L("painted", void 0);
          return;
        }
        w = te.message.id;
      });
    },
    onAssistantMessage(te) {
      P("assistant message", () => oe(te));
    },
    setUserWaiting(te) {
      P("user wait", () => {
        if (N) return;
        let at = G.at(-1);
        if (te && (at === void 0 || at.toMs !== void 0)) G.push({ fromMs: now(), toMs: void 0 });
        else if (!te && at !== void 0 && at.toMs === void 0) at.toMs = now();
      });
    },
    markFirstTextPainted(te, Q) {
      P("paint stamp", () => {
        if (N || E) return;
        let ne = Q ?? w;
        if (ne === void 0) return;
        let z = S.get(ne);
        if (
          ((E = {
            atMs: now(),
            messageId: ne,
            order: z?.order ?? T + 1,
            toolCallsBefore: z?.toolCallsBefore ?? D,
            renderPath: te,
          }),
          z)
        )
          L("painted", void 0);
      });
    },
    end(te, Q = isAbortedTerminalReason(te)) {
      P("settle", () => L(Q ? "interrupted" : "no_text", te));
    },
  };
}
/**
 * 为一轮无头查询开始计时：生成查询链 id，创建首段文本计时器，并订阅会话的"等待用户决定"状态以暂停计时；dispose 时取消订阅。
 */
//@ chunk-0sfjpx19.js:83013-83330 placement
function startTurnTiming({ toolUseContext: toolUseContext, sessionState: sessionState }) {
  let r = randomUUID();
  toolUseContext.queryTracking = { chainId: r, depth: -1 };
  let s = createFirstTextTimer({
    queryChainId: r,
    observesUserWait: sessionState !== void 0,
    textToolNames: LLt,
  });
  s.setUserWaiting(sessionState?.userDecisionPending ?? !1);
  let h = sessionState?.userDecisionPendingChanged.subscribe((y) => s.setUserWaiting(y));
  return {
    ...s,
    dispose() {
      h?.();
    },
  };
}
//@ chunk-0sfjpx19.js:83367-83400 placement
var ws = 10,
  Co = 1000 / ws,
  vo = 3,
  Ao = 1e4;
/**
 * 把钩子附件（非阻塞错误、取消等）转换为 SDK 输出消息。
 */
//@ chunk-0sfjpx19.js:83400-86729 placement
function collectHookAttachmentMessages({
  session: session,
  sessionHooks: sessionHooks,
  onStreamingDisplay: onStreamingDisplay,
  onStreamingRewrite: onStreamingRewrite,
  onMessageDisplay: onMessageDisplay,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let b = randomUUID_2(),
    k = null;
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
      onStreamingRewrite({ original: R.raw.slice(0, R.resolvedOffset), text: R.output });
      return;
    }
    if ((onMessageDisplay(R.apiMessageId, R.output + Cb(R.raw.slice(R.resolvedOffset))), !R.finalized))
      (onStreamingRewrite(null), onStreamingDisplay(""));
  }
  function T(R, P, U, L, oe) {
    R.inFlight++;
    let now = Date.now(),
      Q = (async () => {
        let ne = L;
        try {
          for await (let z of executeMessageDisplayHooks(
            session,
            { turnId: R.turnId, messageId: R.messageId, index: P, final: U, delta: L },
            sessionHooks,
            R.abortController.signal,
            Ao,
            storageV5,
            credentials,
          )) {
            if (
              z.message?.type === "attachment" &&
              (z.message.attachment.type === "hook_non_blocking_error" ||
                z.message.attachment.type === "hook_cancelled")
            )
              R.stats.errorCount++;
            if (z.displayContent !== void 0) ne = z.displayContent;
          }
        } catch (error) {
          (R.stats.errorCount++,
            logForDebugging(
              `MessageDisplay hook flush ${P} failed; displaying original delta: ${error instanceof Error ? error.message : String(error)}`,
              { level: "error" },
            ));
        } finally {
          let z = Date.now() - now;
          ((R.stats.totalDurationMs += z),
            (R.stats.maxDurationMs = Math.max(R.stats.maxDurationMs, z)),
            R.inFlight--,
            D(R));
        }
        return ne;
      })();
    R.appendChain = R.appendChain.then(async () => {
      let ne = await Q;
      ((R.output += ne), (R.resolvedOffset = oe), (R.isRewritten ||= ne !== L), w(R));
    });
  }
  function D(R) {
    if (R.abandoned) return;
    if (R.finalized) {
      if (!R.finalDispatched) E(R, !0);
      else if (R.inFlight === 0 && !R.stats.summaryEmitted)
        ((R.stats.summaryEmitted = !0),
          logEvent("tengu_message_display_hooks", {
            flushCount: R.index,
            errorCount: R.stats.errorCount,
            totalDurationMs: R.stats.totalDurationMs,
            maxDurationMs: R.stats.maxDurationMs,
          }));
      return;
    }
    N(R);
  }
  function E(R, P) {
    if (R.flushTimer !== null) (clearTimeout(R.flushTimer), (R.flushTimer = null));
    if (R.inFlight >= vo) return;
    let U = P
        ? R.raw.length
        : R.raw.lastIndexOf(`
`) + 1,
      sliced = R.raw.slice(R.flushedOffset, U);
    if (!P && sliced === "") return;
    if (P) R.finalDispatched = !0;
    ((R.flushedOffset = U), (R.lastFlushAt = Date.now()));
    let index = R.index;
    (R.index++, T(R, index, P, Cb(sliced), U));
  }
  function N(R) {
    if (R.flushTimer !== null) return;
    if (R.inFlight >= vo) return;
    if (
      R.raw.lastIndexOf(`
`) +
        1 <=
      R.flushedOffset
    )
      return;
    let U = Date.now() - R.lastFlushAt;
    if (U >= Co) {
      E(R, !1);
      return;
    }
    R.flushTimer = setTimeout(
      (L, oe) => {
        if (((L.flushTimer = null), !L.finalized && !L.abandoned)) oe(L, !1);
      },
      Co - U,
      R,
      E,
    );
  }
  function G(R) {
    if (((R.abandoned = !0), R.flushTimer !== null)) (clearTimeout(R.flushTimer), (R.flushTimer = null));
    R.abortController.abort();
  }
  return {
    newTurn() {
      if (k && !k.finalized) G(k);
      ((k = null), (b = randomUUID_2()));
    },
    begin(R) {
      if (k && !k.finalized) G(k);
      if ((onStreamingRewrite(null), !hasHookForEvent("MessageDisplay", sessionHooks, session.id))) {
        ((k = null), onStreamingDisplay(null));
        return;
      }
      let P = !hasSettingsHookForEvent("MessageDisplay", sessionHooks, session.id) && !FNi("MessageDisplay");
      ((k = {
        apiMessageId: R,
        messageId: randomUUID_2(),
        turnId: b,
        raw: "",
        flushedOffset: 0,
        index: 0,
        output: "",
        isLive: P,
        resolvedOffset: 0,
        isRewritten: !1,
        appendChain: Promise.resolve(),
        lastFlushAt: 0,
        flushTimer: null,
        inFlight: 0,
        abortController: new AbortController(),
        finalized: !1,
        finalDispatched: !1,
        done: !1,
        abandoned: !1,
        stats: { totalDurationMs: 0, maxDurationMs: 0, errorCount: 0, summaryEmitted: !1 },
      }),
        onStreamingDisplay(P ? null : ""));
    },
    delta(R) {
      if (k === null || k.finalized) return;
      ((k.raw += R), N(k));
    },
    entryLanded(R) {
      stripMemoryTags(ICe.of(session), R, "repl");
      let P = k;
      if (P === null || P.apiMessageId !== R.message.id) return;
      if (P.raw === "" || !R.message.content.some((U) => U.type === "text")) return;
      if (((P.done = !0), w(P), !P.isLive)) onStreamingDisplay("");
    },
    finalize() {
      let R = k;
      if (R === null) return;
      if (
        ((R.finalized = !0),
        (k = null),
        onStreamingDisplay(null),
        onStreamingRewrite(null),
        R.raw === "" && R.index === 0)
      )
        return;
      ((R.done = !0), E(R, !0), w(R));
    },
  };
}
/**
 * 去掉助手文本中的记忆标签（tengu_cc_memory_tag_stripped）。
 */
//@ chunk-0sfjpx19.js:86729-87619 placement
function stripMemoryTags(e, n, r) {
  for (let s of n.message.content) {
    let h =
      s.type === "text"
        ? { name: "text", source: s.text }
        : s.type === "thinking"
          ? { name: "thinking", source: s.thinking }
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
      request_id: ye(n.requestId),
      messageID: ye(n.message.id),
    });
  }
}
/**
 * 清理 displayedMessageContent：只保留仍存在于消息列表中的助手消息 id 对应的条目，无变化时返回原状态。
 */
//@ chunk-0sfjpx19.js:87619-87926 placement
function pruneDisplayedContent(e, n) {
  if (Object.keys(e.displayedMessageContent).length === 0) return e;
  let r = new Set();
  for (let y of n) if (y.type === "assistant") r.add(y.message.id);
  let s = {},
    h = !1;
  for (let [y, _] of Object.entries(e.displayedMessageContent))
    if (r.has(y)) s[y] = _;
    else h = !0;
  if (!h) return e;
  return { ...e, displayedMessageContent: s };
}
/**
 * 对完成的消息运行 MessageDisplay 钩子，失败时输出原消息。
 */
//@ chunk-0sfjpx19.js:87926-88741 placement
async function runMessageDisplayHook(e, n, r, s, h, y, _) {
  stripMemoryTags(ICe.of(e), n, "sdk");
  let b = stripMemoryTagsFromBlocks(n.message.content),
    k = b === n.message.content ? n : { ...n, message: { ...n.message, content: b } },
    w = { message: k, hookOutputApplied: !1 };
  if (!hasHookForEvent("MessageDisplay", s, e.id)) return w;
  let joined = k.message.content.map((E) => (E.type === "text" ? E.text : "")).join("");
  if (joined === "") return w;
  let T;
  try {
    for await (let E of executeMessageDisplayHooks(
      e,
      { turnId: r, messageId: randomUUID_2(), index: 0, final: !0, delta: joined },
      s,
      h,
      Ao,
      y,
      _,
    ))
      if (E.displayContent !== void 0) T = E.displayContent;
  } catch (error) {
    return (
      logForDebugging(
        `MessageDisplay hook failed for completed message; emitting original text: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      w
    );
  }
  if (T === void 0) return w;
  let D = !0;
  return {
    hookOutputApplied: !0,
    message: {
      ...k,
      message: {
        ...k.message,
        content: k.message.content.map((E) => {
          if (E.type !== "text") return E;
          let N = D ? T : "";
          return ((D = !1), withCitationsDropped(E, N));
        }),
      },
    },
  };
}
//@ chunk-0sfjpx19.js:88741-88752 placement
var Ss = 200;
//@ chunk-0sfjpx19.js:88752-89280 placement
function applyMessageListAppend(e, n) {
  switch (e.type) {
    case "append":
      return { rows: e.messages, keep: (r) => n({ type: "append", messages: [...r] }) };
    case "append-or-move-by-uuid":
      return {
        rows: [e.message],
        keep: (r) => {
          for (let s of r) n({ type: "append-or-move-by-uuid", message: s });
        },
      };
    case "replace-by-uuid":
      return {
        rows: [e.message],
        keep: (r) => {
          for (let s of r) n({ type: "replace-by-uuid", uuid: e.uuid, message: s });
        },
      };
    case "insert-after-uuid": {
      let uuid = e.uuid;
      return {
        rows: e.messages,
        keep: (s) => {
          (n({ type: "insert-after-uuid", uuid: uuid, messages: [...s] }), (uuid = s.at(-1)?.uuid ?? uuid));
        },
      };
    }
    default:
      return;
  }
}
/**
 * 按 append/replace-all/remove-by-uuid 等操作更新消息列表。
 */
//@ chunk-0sfjpx19.js:89280-90278 placement
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
      return (sliced.splice(index, 1), sliced);
    }
    case "replace-by-uuid": {
      let index = e.findIndex((s) => s.uuid === n.uuid);
      return index === -1 ? [...e, n.message] : e.with(index, n.message);
    }
    case "insert-after-uuid": {
      let index = e.findIndex((h) => h.uuid === n.uuid);
      if (index === -1 || n.messages.length === 0) return e;
      let sliced = e.slice();
      return (sliced.splice(index + 1, 0, ...n.messages), sliced);
    }
    case "replace-last-ephemeral-progress": {
      let max = Math.max(0, e.length - Ss),
        s = n.message.data;
      for (let h = e.length - 1; h >= max; h--) {
        let y = e[h];
        if (y?.type !== "progress") break;
        let _ = y.data;
        if (y.parentToolUseID === n.message.parentToolUseID && _.type === s.type) return e.with(h, n.message);
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
  let resolved = Promise.resolve(),
    r = 0,
    s = 0,
    h = -1;
  return {
    enqueue(y, _) {
      let b = r,
        k = s;
      resolved = resolved
        .then(() => {
          if (k <= h)
            return (
              logForDebugging(
                `${y}: not dispatched, the tail was severed while it waited behind an event that never settled`,
              ),
              []
            );
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
        .catch((w) => logForDebugging(`${y} failed: ${errorMessage(w)}`));
    },
    reset: () => {
      r += 1;
    },
    settled: () => resolved,
    sever: () => {
      ((r += 1), (h = s), (s += 1), (resolved = Promise.resolve()));
    },
  };
}
//@ chunk-0sfjpx19.js:90814-90910 placement
function GLi(e) {
  let n = describeDroppedNotes(e);
  return { begin: randomUUID_3, enqueue: n.enqueue, settled: n.settled, sever: n.sever };
}
//@ chunk-0sfjpx19.js:90910-91367 placement
function buildTurnStartEvent(e) {
  let { newMessages: newMessages, input: input, signal: signal, abort: abort } = e,
    last = newMessages.findLast((D) => D.type === "user" && !D.isMeta),
    _ = last && last.type === "user",
    b = (_ ? getContentText(last.message.content) : null) ?? input ?? "",
    begin = e.turnEvents.begin(),
    withResolvers = Promise.withResolvers(),
    S = Jue({ signal: signal });
  e.turnEvents.enqueue("turn.start", () =>
    S.turn
      .start({ text: b, turnId: begin })
      .then(() => [])
      .finally(withResolvers.resolve),
  );
  let T = _ === !0 && isHumanOrUnset(last.origin);
  return (
    setClassifierChecking({
      turnId: begin,
      abort: abort,
      started: withResolvers.promise,
      startedBy: T ? "person" : "automatic",
    }),
    resolvePromptEntryWaiters(newMessages),
    begin
  );
}
//@ chunk-0sfjpx19.js:91367-91596 placement
function abortTurnSignal(e, n) {
  return (
    V_e.prune(e.getCommandQueue()),
    new Promise((r) => {
      let s = () => V_e.isAnyAside() || e.peek((h) => V_e.has(h.uuid)) !== void 0;
      if (s()) {
        r();
        return;
      }
      n.addEventListener(
        "abort",
        e.subscribe(() => {
          if (s()) r();
        }),
        { once: !0 },
      );
    })
  );
}
//@ chunk-0sfjpx19.js:91596-91655 placement
function sNn() {
  ao().remoteEgressSuppressed = () => isRemoteEgressSuppressedFor(pinSessionId(getSessionId()));
}
//@ chunk-0sfjpx19.js:91691-91738 placement
var Ns = 8388608,
  $s = '"artifact-comment-monitor"';
//@ chunk-0sfjpx19.js:91738-91827 placement
async function vAs(e) {
  let n = getTranscriptPathForSession(e),
    r = await fileSizeOrUndefined(n);
  return r === void 0 ? void 0 : { path: n, size: r };
}
//@ chunk-0sfjpx19.js:91827-91945 placement
async function fileSizeOrUndefined(e) {
  try {
    let n = await open(e, "r");
    try {
      return (await n.stat()).size;
    } finally {
      await n.close();
    }
  } catch {
    return;
  }
}

export {
  describeDroppedNotes,
  Ns,
  $s,
  applyMessageListAppend,
  applyMessageListEdit,
  pruneDisplayedContent,
  sNn,
  vAs,
  GLi,
  abortTurnSignal,
  startTurnTiming,
  buildTurnStartEvent,
  runMessageDisplayHook,
  collectReadNotificationsToolUseIds,
  collectHookAttachmentMessages,
  createFirstTextTimer,
};
