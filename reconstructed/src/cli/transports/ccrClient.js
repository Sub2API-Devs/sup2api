/**
 * cli/transports/ccrClient.ts
 *
 * CCR（云会话）worker 客户端：事件批量上传、状态、心跳、投递确认与流事件处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/ccrClient.ts
 * pieces: chunk-3wek6r2k.js (1), chunk-fp6aqx1j.js (88)
 * attribution: fingerprint 3, placement 70, layout 11, affinity 4, callgraph-witnessed 1
 */
import { randomUUID } from "crypto";
import { count, setsEqual, uniq } from "../../utils/collections.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { Oun, findCoalescedRunHead, coalesceStreamEvents } from "./streamEventCoalescing.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isKnownContentBlockType } from "../../services/api/requestHeaders.js";
import { _Ce } from "../../services/remoteTools/remoteToolsDebug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../handlers/util.js";
import { kt, E, M, A, o, u, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { getSessionIngressAuthHeaders, getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { convertWsUrlToPostUrl } from "./HybridTransport.js";
import { WorkerStateUploader } from "./WorkerStateUploader.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logForDiagnosticsNoPII, flushDiagnosticLogs } from "../../utils/diagLogs.js";
import { ClientEventUploader, q6e, ugr, fgr, cro } from "../../utils/telemetry/memorySummary.js";
import { dedupeEventsByUuid } from "../../utils/teleport/api.js";
import { Vt } from "../../utils/agentId.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  isAssistantWithMessageId,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  normalizeUserToolUseResult,
} from "./ccrMessageMapping.js";
import { isRelayableControlFrame } from "../../remote/RemoteSessionManager.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  resolveWorkerRequiresActionState,
  eventBatchResultSchema,
  sessionEventsPageSchema,
  agentMetadataEventsSchema,
} from "./_new/pendingActionSchema.js";
import {
  setActivityCallback,
  onWorkStarted,
  hasActiveWork,
  clearActivityCallback,
  getMainLoopRefcount,
} from "../../utils/sessionActivity.js";
import { logError } from "../../utils/log.js";
import { Jli } from "../../bridge/createSession.js";
import { Br } from "../../utils/startupTiming.js";
import { notifySessionStateChanged, requestIdOf } from "../../utils/sessionState.js";
import { proxyAwareFetch } from "../../upstreamproxy/proxyFetch.js";
import { getClientPlatform, claudeCodeUserAgent, drainResponseBody } from "../../utils/http.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { readRequestIdSource, v5e } from "../../services/api/requestIdSource.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { buildRequiresActionDetails } from "../structuredIO.js";
import { MKs } from "../../services/mcp/hearthDegraded.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { capLiveOnlyResponseSize, isLiveOnlyResponse } from "../../bridge/controlRequests.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { xbt } from "../../../vendor/lodash-es/chunk.js";
import { isClassifierDumpEvent } from "../../utils/teleport/autoModeDumps.js";
import { registerCleanup, registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-fp6aqx1j.js:1962-2061 placement
var _n = ["x-ccr-ticket-rev", "x-ccr-ticket-session", "x-ccr-ticket-seq"],
  mn = /^[A-Za-z0-9_-]{1,4096}$/;
//@ chunk-fp6aqx1j.js:2061-2498 placement
class TicketHeaders {
  authorization;
  held = new Map();
  headersFor(e) {
    if (e === void 0) return {};
    if (e !== this.authorization) (this.held.clear(), (this.authorization = e));
    return Object.fromEntries(this.held);
  }
  note(e, n) {
    if (e === void 0 || e !== this.authorization) return;
    if (n.redirected || (n.status >= 400 && n.status < 500 && n.status !== 429)) {
      this.held.clear();
      return;
    }
    for (let s of _n) {
      let r = n.headers.get(s);
      if (r === "") this.held.delete(s);
      else if (r !== null && mn.test(r)) this.held.set(s, r);
    }
  }
}
//@ chunk-fp6aqx1j.js:2498-2508 placement
var vn = 64;
//@ chunk-fp6aqx1j.js:2508-3134 placement
class UploadBacklogStats {
  rowsAhead;
  queuedSince = new WeakSet();
  attempts = [];
  posts = 0;
  failedPosts = 0;
  rows = 0;
  constructor(e) {
    this.rowsAhead = e;
  }
  noteQueued(e) {
    for (let n of e) this.queuedSince.add(n);
  }
  noteAttempt(e, n, s) {
    let r = count(e, (h) => this.queuedSince.has(h));
    if ((this.posts++, s)) this.rows += r;
    else this.failedPosts++;
    if (this.attempts.length < vn)
      this.attempts.push({ startedAt: n, endedAt: performance.now(), ahead: r === 0 });
  }
  seen(e) {
    let n = 0,
      s = 0;
    for (let { startedAt: startedAt, endedAt: endedAt, ahead: ahead } of this.attempts) {
      let max = Math.max(0, endedAt - Math.max(startedAt, e));
      if (ahead) n += max;
      else s += max;
    }
    return {
      aheadMs: n,
      postMs: s,
      posts: this.posts,
      failedPosts: this.failedPosts,
      rowsAhead: this.rowsAhead,
      rows: this.rows,
    };
  }
}
//@ chunk-fp6aqx1j.js:3134-3147 placement
var L1t = 1536;
//@ chunk-fp6aqx1j.js:3147-3221 placement
function Pe(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
/**
 * 压缩后的 boundary 行如果 preservedMessages.uuids 过多，只保留最后 n 个并同步裁剪 allUuids 与 preservedSegment.headUuid。
 */
//@ chunk-fp6aqx1j.js:3221-3630 placement
function trimPreservedMessagesMetadata(e, n = L1t) {
  let compactMetadata = e.compactMetadata;
  if (!isPlainObject(compactMetadata)) return null;
  let preservedMessages = compactMetadata.preservedMessages;
  if (!isPlainObject(preservedMessages)) return null;
  let uuids = preservedMessages.uuids;
  if (!Pe(uuids) || uuids.length <= n) return null;
  let sliced = uuids.slice(-n),
    v = sliced[0],
    allUuids = preservedMessages.allUuids,
    O = Pe(allUuids) ? allUuids.indexOf(v) : -1,
    preservedSegment = compactMetadata.preservedSegment;
  return {
    ...e,
    compactMetadata: {
      ...compactMetadata,
      preservedMessages: {
        ...preservedMessages,
        uuids: sliced,
        ...(Pe(allUuids) && { allUuids: O >= 0 ? allUuids.slice(O) : allUuids.slice(-n) }),
      },
      ...(isPlainObject(preservedSegment) && { preservedSegment: { ...preservedSegment, headUuid: v } }),
    },
  };
}
//@ chunk-fp6aqx1j.js:3630-3693 placement
var TENGU_PATIENT_LEDGER = "tengu_patient_ledger",
  gn = 10,
  wn = 1e4,
  fUr = 400,
  yn = 2097152;
//@ chunk-fp6aqx1j.js:3693-3796 placement
function isIsoTimestamp(e) {
  return typeof e === "string" && /^\d{4}-\d{2}-\d{2}T/.test(e) && !Number.isNaN(Date.parse(e));
}
//@ chunk-fp6aqx1j.js:3796-4060 placement
function parseClientRowsOwedSpans(e) {
  if (!isPlainObject(e) || e.v !== 1 || !Array.isArray(e.spans)) return [];
  return e.spans.flatMap((span) =>
    isPlainObject(span) && isIsoTimestamp(span.since)
      ? [
          {
            since: span.since,
            ...(typeof span.until === "string" && span.until !== "" && { until: span.until }),
            tries: Number.isInteger(span.tries) && Number(span.tries) > 0 ? Number(span.tries) : 0,
          },
        ]
      : [],
  );
}
/**
 * 记录本轮已发送/重发的消息与未应答项，用于恢复时补发（tengu_patient_ledger）。
 */
//@ chunk-fp6aqx1j.js:4060-6802 placement
class TurnLedger {
  earlier = [];
  sentAgain = new Set();
  own = void 0;
  unanswered = new Set();
  writes = !1;
  refused = !1;
  runOpen = !1;
  startedAt = "";
  runOpenedAt = "";
  guardLapsed = !1;
  stampsCountFrom = 0;
  spansGivenUpAtStart = 0;
  get earlierSpans() {
    return this.earlier;
  }
  get rowsSentAgain() {
    return this.sentAgain;
  }
  get writesNoMore() {
    return this.refused;
  }
  workerRecordRead(e, n) {
    if (e.readFailed === !0) return;
    ((this.writes = !0),
      (this.startedAt = n.toISOString()),
      (this.stampsCountFrom = n.getTime()),
      (this.runOpenedAt = this.startedAt));
    let s = parseClientRowsOwedSpans(e.internal?.client_rows_owed);
    ((this.earlier = s.filter((r) => r.tries < gn)),
      (this.spansGivenUpAtStart = s.length - this.earlier.length));
  }
  stateReported(e, n, s) {
    if (this.runOpen === (e === "idle"))
      ((this.runOpen = !this.runOpen),
        (this.runOpenedAt = this.runOpen ? n.toISOString() : this.runOpenedAt));
    if (!s) return this.guardEnded(n);
    return (
      (this.runOpen ? this.openOwnSpan(n) : this.rowsAnswered([])) ??
      (this.writes && (this.own !== void 0 || this.earlier.length > 0) ? this.note() : void 0)
    );
  }
  rowsEntered(e, n) {
    let filtered = e.filter((h) => getMainThreadTurnUuid(h) !== void 0);
    for (let h of filtered) this.unanswered.add(String(h.uuid));
    if (this.unanswered.size > wn) (this.unanswered.clear(), (this.writes = !1));
    if (filtered.length === 0) return;
    let min = Math.min(
      n.getTime(),
      ...filtered
        .flatMap((h) => (isIsoTimestamp(h.timestamp) ? [Date.parse(h.timestamp)] : []))
        .filter((h) => h >= this.stampsCountFrom),
    );
    if (this.own === void 0) return this.openOwnSpan(new Date(min));
    if (!this.writes || min >= Date.parse(this.own.since)) return;
    return ((this.own = { ...this.own, since: new Date(min).toISOString() }), this.note());
  }
  rowsAnswered(e) {
    let n = this.sentAgain.size > 0;
    for (let h of e) (this.unanswered.delete(h), this.sentAgain.delete(h));
    let s = n && this.sentAgain.size === 0,
      r = this.own !== void 0 && !this.runOpen && this.unanswered.size === 0;
    if (!this.writes || (!s && !r)) return;
    return ((this.earlier = s ? [] : this.earlier), (this.own = r ? void 0 : this.own), this.note());
  }
  guardEnded(e) {
    if (
      ((this.guardLapsed = !0),
      (this.stampsCountFrom = e.getTime()),
      this.unanswered.clear(),
      !this.writes || this.own === void 0)
    )
      return;
    return ((this.own = void 0), this.note());
  }
  earlierSpansTried(e) {
    return this.replaceEarlier(
      this.earlier.map((n) => ({ ...n, until: n.until ?? e ?? this.startedAt, tries: n.tries + 1 })),
    );
  }
  earlierRowsSentAgain(e) {
    for (let n of e) this.sentAgain.add(n);
  }
  earlierRowsWithdrawn() {
    this.sentAgain.clear();
  }
  earlierSpansGivenUp() {
    return this.replaceEarlier([]);
  }
  reportWithNoteRefused() {
    ((this.writes = !1), (this.refused = !0));
  }
  replaceEarlier(e) {
    if (!this.writes || this.earlier.length === 0) return;
    return ((this.earlier = e), this.note());
  }
  openOwnSpan(e) {
    if (!this.writes || this.own !== void 0) return;
    return (
      (this.own = {
        since: this.guardLapsed
          ? e.toISOString()
          : new Date(Math.max(Date.parse(this.runOpenedAt), this.stampsCountFrom)).toISOString(),
        tries: 0,
      }),
      (this.guardLapsed = !1),
      this.note()
    );
  }
  note() {
    let mapped = this.earlier.map((s) => ({ ...s, until: s.until ?? this.startedAt })),
      n = this.own ? [...mapped, this.own] : mapped;
    return { client_rows_owed: n.length > 0 ? { v: 1, spans: n } : null };
  }
}
//@ chunk-fp6aqx1j.js:6802-7052 placement
function getMainThreadTurnUuid(e) {
  let n = isPlainObject(e.message) ? e.message.content : void 0;
  return typeof e.uuid === "string" &&
    Array.isArray(n) &&
    e.isSidechain !== !0 &&
    !e.parent_tool_use_id &&
    (e.type === "assistant" ||
      (e.type === "user" && n.some((s) => isPlainObject(s) && s.type === "tool_result")))
    ? e.uuid
    : void 0;
}
//@ chunk-fp6aqx1j.js:7052-7911 placement
function selectRowsToResend(e, n, s = () => !0) {
  let r = "nothing",
    flattened = e.flatMap(({ since: since, until: until }) => {
      let index = n.findIndex(isAtOrAfterTimestamp(since)),
        C = index < 0 ? [] : n.slice(index),
        U =
          until === void 0
            ? -1
            : isIsoTimestamp(until)
              ? C.findIndex(isAtOrAfterTimestamp(until))
              : C.findIndex((W) => W.uuid === until) + 1,
        S = U < 0 ? C : C.slice(0, U);
      if (
        (until !== void 0 && !isIsoTimestamp(until) && !n.some((W) => W.uuid === until)) ||
        S.some((W) => W.type === "system" && W.subtype === "compact_boundary")
      )
        r = "rows_before_a_compaction";
      let P = [];
      for (let W of S) {
        let x = getMainThreadTurnUuid(W) !== void 0 && s(W);
        if (x === "nor_any_after_it") {
          r = "reply_without_this_sessions_mark";
          break;
        }
        if (x) P.push(W);
      }
      return P.length > 0 ? [P] : [];
    }),
    w = new Set();
  for (let v of flattened) {
    let y = 0,
      O = 0,
      index = v
        .toReversed()
        .findIndex(
          (U, S) => (
            (y += Buffer.byteLength(jsonStringify(U))),
            (O +=
              isPlainObject(U.message) && Array.isArray(U.message.content) ? U.message.content.length : 1),
            S > 0 && (O > Math.floor(fUr / flattened.length) || y > yn / flattened.length)
          ),
        );
    for (let U of index < 0 ? v : v.slice(v.length - index)) w.add(U);
    if (index >= 0) r = "rows_over_the_limits";
  }
  return { rows: [...w], leftOut: r };
}
//@ chunk-fp6aqx1j.js:7911-8078 placement
function findLastRowBeforeSpans(e, n, s) {
  let index = n.findIndex(isAtOrAfterTimestamp(Math.min(...e.map(({ since: since }) => Date.parse(since))))),
    h = (index < 0 ? n : n.slice(0, index)).findLast(s)?.uuid;
  return typeof h === "string" ? h : void 0;
}
//@ chunk-fp6aqx1j.js:8078-8190 placement
function isAtOrAfterTimestamp(e) {
  let time = new Date(e).getTime();
  return (s) => typeof s.timestamp === "string" && Date.parse(s.timestamp) >= time;
}
//@ chunk-fp6aqx1j.js:8190-8432 placement
var STREAM_EVENT_TYPES = {
    message_start: !0,
    message_delta: !0,
    message_stop: !0,
    content_block_start: !0,
    content_block_delta: !0,
    content_block_stop: !0,
  },
  STREAM_DELTA_TYPES = {
    text_delta: !0,
    input_json_delta: !0,
    citations_delta: !0,
    thinking_delta: !0,
    signature_delta: !0,
    compaction_delta: !0,
  };
//@ chunk-fp6aqx1j.js:8432-8725 placement
function stripInputTransformations(e) {
  let { event: event } = e;
  if (event.type === "message_start" && event.message?.input_transformations) {
    let { input_transformations: input_transformations, ...r } = event.message;
    return { ...e, event: { ...event, message: r } };
  }
  if (event.type === "message_delta" && event.input_transformations) {
    let { input_transformations: input_transformations, ...r } = event;
    return { ...e, event: r };
  }
  return e;
}
//@ chunk-fp6aqx1j.js:8725-9005 placement
function dropOversizeStreamEvent(e, n) {
  let s = describeStreamEventForTelemetry(e.event),
    joined = Object.entries(s)
      .map(([h, w]) => `${h}=${w}`)
      .join(" ");
  (logForDebugging(
    `CCRClient: dropping oversize ephemeral stream_event (${joined}, ${n} bytes, over the ${Oun}-byte limit)`,
    { level: "warn" },
  ),
    logFeatureSad("ccr_partial_messages", "oversize_ephemeral_skipped", { ...s, bytes: n }));
}
//@ chunk-fp6aqx1j.js:9005-9295 placement
function describeStreamEventForTelemetry(e) {
  if (!isPlainObject(e)) return { event_type: lit("other") };
  let { type: n, delta: delta, content_block: content_block } = e,
    h = isPlainObject(content_block) ? content_block.type : void 0;
  return {
    event_type: fromEnum(it(STREAM_EVENT_TYPES, n)),
    ...(n === "content_block_delta" && {
      delta_type: fromEnum(it(STREAM_DELTA_TYPES, isPlainObject(delta) ? delta.type : void 0)),
    }),
    ...(n === "content_block_start" && {
      content_block_type: isKnownContentBlockType(h) ? fromEnum(h) : lit("other"),
    }),
  };
}
//@ chunk-fp6aqx1j.js:9295-9359 placement
function it(e, n) {
  for (let key in e) if (key === n) return key;
  return "other";
}
//@ chunk-fp6aqx1j.js:9359-9379 layout
var TEXT_POST_GAP_MS = 500,
  MAX_TIMER_LATENESS_MS = 60000;
//@ chunk-fp6aqx1j.js:9379-9497 layout
function getTextRhythm(e) {
  return (
    (e.textRhythm ??= { posts: 0, gapsOver500Ms: 0, lastPostAtMs: void 0, timerMaxLateMs: void 0 }),
    e.textRhythm
  );
}
//@ chunk-fp6aqx1j.js:9497-9736 fingerprint = accumulateStreamEvents (0.846)
function accumulateStreamEvents(e) {
  if (e.type !== "stream_event" || e.parent_tool_use_id != null) return !1;
  let { event: event } = e;
  if (!isPlainObject(event) || event.type !== "content_block_delta") return !1;
  let { delta: delta } = event;
  return (
    isPlainObject(delta) &&
    delta.type === "text_delta" &&
    typeof delta.text === "string" &&
    /\S/.test(delta.text)
  );
}
//@ chunk-fp6aqx1j.js:9736-9828 affinity
function markTextDeltaRows(e, n) {
  let s = !1;
  for (let r of e) if (accumulateStreamEvents(r.payload) && !n.has(r)) (n.add(r), (s = !0));
  return s;
}
//@ chunk-fp6aqx1j.js:9828-9950 affinity
function recordTextPost(e, n) {
  let s = getTextRhythm(e);
  if ((s.posts++, s.lastPostAtMs !== void 0 && n - s.lastPostAtMs > TEXT_POST_GAP_MS)) s.gapsOver500Ms++;
  s.lastPostAtMs = n;
}
//@ chunk-fp6aqx1j.js:9950-10071 affinity
function recordTimerLateness(e, n) {
  if (!(n >= 0)) return;
  let s = getTextRhythm(e);
  s.timerMaxLateMs = Math.max(s.timerMaxLateMs ?? 0, Math.min(Math.round(n), MAX_TIMER_LATENESS_MS));
}
//@ chunk-fp6aqx1j.js:10071-10761 affinity
class HoldStats {
  counts = {
    wholeTurnHolds: 0,
    wholeTurnHoldsKeptToTurnEnd: 0,
    clientEvents: { releases: 0, heldRows: 0, maxHeldRows: 0, maxHeldMs: 0 },
    internalEvents: { releases: 0, heldRows: 0, maxHeldRows: 0, maxHeldMs: 0 },
  };
  wholeTurnHoldStands = !1;
  released(e, n, s) {
    let r = e === "client_events" ? this.counts.clientEvents : this.counts.internalEvents;
    ((r.releases += 1),
      (r.heldRows += n),
      (r.maxHeldRows = Math.max(r.maxHeldRows, n)),
      (r.maxHeldMs = Math.max(r.maxHeldMs, s)));
  }
  wholeTurnHoldStarted() {
    if (!this.wholeTurnHoldStands) ((this.wholeTurnHoldStands = !0), (this.counts.wholeTurnHolds += 1));
  }
  wholeTurnHoldEndedEarly() {
    this.wholeTurnHoldStands = !1;
  }
  turnEnded() {
    if (this.wholeTurnHoldStands)
      ((this.wholeTurnHoldStands = !1), (this.counts.wholeTurnHoldsKeptToTurnEnd += 1));
  }
}
//@ chunk-fp6aqx1j.js:15795-15943 placement
var EMPTY_UPLOAD_TRIM = {},
  DEFAULT_HEARTBEAT_INTERVAL_MS = 20000,
  MIN_HEARTBEAT_INTERVAL_MS = 1e4,
  MAX_HEARTBEAT_LEAD_MS = 15000,
  HEARTBEAT_SAFETY_MARGIN_MS = 5000,
  AUTH_REFRESH_TIMEOUT_MS = HEARTBEAT_SAFETY_MARGIN_MS,
  UNUSED_TIMEOUT_5000_MS = 5000,
  DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS = 300000,
  SHUTDOWN_REQUEST_TIMEOUT_MS = 2000,
  TOKEN_REFRESH_LEAD_MS = MAX_HEARTBEAT_LEAD_MS + AUTH_REFRESH_TIMEOUT_MS + 2 * DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_PROBE_BEAT_SPACING_MS = 5000,
  HEARTBEAT_STALE_FACTOR = 1.5,
  MAX_CONSECUTIVE_HEARTBEAT_FAILURES = 3,
  HEARTBEAT_FATAL_STATUSES = new Set([401, 403, 404, 429]),
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS = 100;
//@ chunk-fp6aqx1j.js:15943-15991 placement
function se(e) {
  return e === 400 || e === 413 || e === 422;
}
//@ chunk-fp6aqx1j.js:15991-16184 placement
var EVENT_BATCH_PATH = "/worker/event-batch",
  BATCH_UNSUPPORTED_STATUSES = new Set([404, 405, 501]),
  RIDE_PAUSE_BASE_MS = 60000,
  RIDE_PAUSE_MAX_MS = 1920000,
  X_CCR_UPLOAD_ATTEMPT = "x-ccr-upload-attempt",
  MIN_EVENT_POST_TIMEOUT_MS = 1e4,
  ROWS_SENT_AGAIN_WAIT_MS = 60000,
  WORKER_STATE_FLUSH_TIMEOUT_MS = 1e4,
  URGENT_EVENT_POST_TIMEOUT_MS = 60000,
  ONE_MIB = 1048576,
  MAX_EVENT_BATCH_BYTES = 4 * ONE_MIB - 65536,
  POST_TIMEOUT_MS_PER_MIB = 5000,
  DEFAULT_MAX_EVENT_POST_TIMEOUT_MS = 120000,
  LARGE_BATCH_RETRY_BACKOFF = 1.5,
  LARGE_BATCH_BYTES = 262144;
/**
 * 按批次字节数估算事件 POST 超时：基础 10s 加每 MiB 5s，大批次（≥256KiB 且不可切分）按重试次数指数放大，夹在 minMs–maxMs。
 */
//@ chunk-fp6aqx1j.js:16184-16360 placement
function computeEventPostTimeoutMs(e, { maxMs: maxMs, minMs: minMs = MIN_EVENT_POST_TIMEOUT_MS }) {
  let r =
      MIN_EVENT_POST_TIMEOUT_MS + Math.round((e.bytes / ONE_MIB) * (POST_TIMEOUT_MS_PER_MIB / 1000)) * 1000,
    h = e.bytes >= LARGE_BATCH_BYTES && !e.cuttable ? r * LARGE_BATCH_RETRY_BACKOFF ** e.retryCount : r;
  return Math.max(minMs, Math.min(maxMs, Math.round(h)));
}
//@ chunk-fp6aqx1j.js:16360-16420 placement
var Vn = new Set(["remote_tool_call", "remote_plumbing_call"]);
//@ chunk-fp6aqx1j.js:16420-16456 placement
function Yn(e) {
  return Vn.has(getControlRequestSubtypeOfEvent(e));
}
/**
 * CCR 客户端的控制请求子类型集合与相关上限常量（可服务调用的子类型、可透传的设置类子类型等）。
 */
//@ chunk-fp6aqx1j.js:16456-16781 placement
var SERVED_CALL_REQUEST_SUBTYPES = new Set(_Ce),
  MAX_URGENT_REQUEST_IDS = 256,
  SETTINGS_CONTROL_SUBTYPES = new Set([
    "apply_flag_settings",
    "set_max_thinking_tokens",
    "set_permission_mode",
    "mcp_set_servers",
    "mcp_reconnect",
    "reload_skills",
  ]),
  DEFAULT_SETTINGS_ANSWER_WAIT_MS = 1000,
  MAX_SETTINGS_REQUEST_IDS = 64,
  HOUSEKEEPING_CONTROL_SUBTYPES = new Set([
    "initialize",
    "stage_file",
    "prefetch_attachments",
    "set_chrome_browser_hints",
    "mcp_toggle",
    "set_mcp_permission_mode_override",
    "set_model",
  ]);
//@ chunk-fp6aqx1j.js:16916-17066 placement
function getControlRequestSubtypeOfEvent(e) {
  let n = e.payload.type === "control_request" ? e.payload.request : void 0;
  return typeof n === "object" && n !== null && "subtype" in n ? n.subtype : void 0;
}
//@ chunk-fp6aqx1j.js:17066-17191 placement = mergeClients (1)
function mergeClients(e) {
  let n = getErrnoCode(e);
  if (n) return n;
  if (e && typeof e === "object" && "name" in e && typeof e.name === "string") return e.name;
  return;
}
/**
 * CCRClient 初始化失败错误（reason + httpStatus）。
 */
//@ chunk-fp6aqx1j.js:17191-17320 fingerprint = CCRInitError (0.859)
class CCRInitError extends Error {
  reason;
  httpStatus;
  constructor(e, n) {
    super(`CCRClient init failed: ${e}`);
    this.reason = e;
    this.httpStatus = n;
  }
}
//@ chunk-fp6aqx1j.js:17320-17416 placement
function kKs(e) {
  return e instanceof CCRInitError && e.reason === "worker_register_failed" && !se(e.httpStatus);
}
/**
 * 连续鉴权失败上限，以及 WebSocket 关闭原因到关闭码的映射（epoch 冲突、被取代、令牌过期等）。
 */
//@ chunk-fp6aqx1j.js:17416-17749 placement
var MAX_CONSECUTIVE_AUTH_FAILURES = 10,
  WORKER_CONFLICT_CLOSE_CODES = {
    epoch_conflict: 4090,
    superseded_by_worker: 4090,
    session_not_active: 4090,
    epoch_stale: 4090,
    session_not_found: 4090,
    token_expired: 4094,
    auth_exhausted: 4094,
  },
  CONFLICT_REASON_IS_SUPERSEDED = {
    epoch_conflict: !0,
    superseded_by_worker: !0,
    session_not_active: !0,
    epoch_stale: !0,
    session_not_found: !1,
    token_expired: !1,
    auth_exhausted: !1,
  },
  MAX_CONSECUTIVE_NOT_FOUND = 3,
  DEFAULT_MAX_ATTEMPTS = 10,
  RETRY_COUNT_3 = 3,
  WORKER_STATE_MAX_ATTEMPTS = 3,
  INTERNAL_EVENT_UUID_BATCH_SIZE = 100;
/**
 * 流式读取响应体，超过字节上限时取消并返回 null；解码出空串但读到字节视为内存不足抛 RangeError。
 */
//@ chunk-fp6aqx1j.js:17749-18138 placement
async function readBodyCapped(e, n) {
  let s = e.body?.getReader(),
    textDecoder = new TextDecoder(),
    h = "",
    w = 0;
  for (let v = await s?.read(); v !== void 0 && !v.done; v = await s?.read()) {
    if (((w += v.value.byteLength), w > n)) return (await s?.cancel(), null);
    let decode = textDecoder.decode(v.value, { stream: !0 });
    if (decode === "" && v.value.byteLength > 6)
      throw (s?.cancel().catch(() => {}), RangeError("out of memory while decoding a page"));
    h += decode;
  }
  return { text: h + textDecoder.decode(), bytes: w };
}
//@ chunk-fp6aqx1j.js:18138-18246 placement
function isTimestampWithinLimit(e, n) {
  let s = e.payload?.timestamp;
  return n === void 0 || s === void 0 || (typeof s === "string" && s.length <= n);
}
//@ chunk-fp6aqx1j.js:18246-18266 placement
var ds = 1e4,
  yt = 30000;
//@ chunk-fp6aqx1j.js:18266-18345 placement
function St(e) {
  return e !== void 0 && e >= 400 && e < 500 ? "not_accepted" : "indeterminate";
}
//@ chunk-fp6aqx1j.js:18345-18551 placement
function detectTaskBookends(e) {
  let n = !1,
    s = !1;
  for (let r of e)
    if (r.payload.subtype === "task_notification") n = !0;
    else if (r.payload.subtype === "background_tasks_changed") s = !0;
  return n || s ? { has_terminal_bookend: n, has_level: s } : null;
}
//@ chunk-fp6aqx1j.js:18551-18623 placement
function ke(e) {
  return Math.min(Math.max(0, Math.trunc(e) || 0), 2147483647);
}
//@ chunk-fp6aqx1j.js:18623-18843 placement
var ENDPOINT_CATEGORIES = {
    "/worker": "worker_state",
    [EVENT_BATCH_PATH]: "events",
    "/worker/events": "events",
    "/worker/events/delivery": "delivery",
    "/worker/heartbeat": "heartbeat",
    "/worker/internal-events": "internal_events",
  },
  MAX_REFUSED_INTERNAL_EVENT_UUIDS = 512,
  UPGRADE_RELAY_MARKER = "upgrade_relay_marker";
//@ chunk-fp6aqx1j.js:20599-22423 placement
var WorkerLimitsSchema = DoctorLazy(() =>
    kt({
      max_events: E().nullish(),
      max_age_ms: E().nullish(),
      max_bytes: E().nullish(),
      flush_on_sampling_end: M().nullish(),
      flush_on_assistant: M().nullish(),
      event_batch_upload: M()
        .nullish()
        .catch(void 0),
      hold_across_model_calls: M()
        .nullish()
        .catch(void 0),
      hold_again: kt({
        soft_age_ms: E().nullish(),
        soft_events: E().nullish(),
        after: A(o()).nullish(),
        never_after_tools: A(o()).nullish(),
        tools_whose_results_wait: A(o()).nullish(),
        later_worker_holds_first_turn: M()
          .nullish()
          .catch(void 0),
      })
        .nullish()
        .catch(void 0),
      may_wait_types: A(o())
        .nullish()
        .catch(void 0),
      flush_after_tool_names: A(o())
        .nullish()
        .catch(void 0),
      settings_receipts_max_wait_ms: E()
        .nullish()
        .catch(void 0),
      messages_received_waits: M()
        .nullish()
        .catch(void 0),
      receipts_ride_uploads: M()
        .nullish()
        .catch(void 0),
      flush_before_tools_wait_ms: E().nullish(),
      flush_after_tools: o().nullish(),
      must_flush_types: A(o()).nullish(),
      live_twin_types: A(o())
        .nullish()
        .catch(void 0),
      live_only_types: A(o())
        .nullish()
        .catch(void 0),
      transcript_max_age_ms: E()
        .nullish()
        .catch(void 0),
      no_turn_max_age_ms: E()
        .nullish()
        .catch(void 0),
      merge_worker_reports: M()
        .nullish()
        .catch(void 0),
      control_traffic_keeps_hold: M()
        .nullish()
        .catch(void 0),
      empty_checkpoint_keeps_hold: M()
        .nullish()
        .catch(void 0),
      first_turn_holds_each_call: M()
        .nullish()
        .catch(void 0),
      settings_answers_max_wait_ms: E()
        .nullish()
        .catch(void 0),
      init_max_wait_ms: E()
        .nullish()
        .catch(void 0),
      metadata_waits_for_status: A(o())
        .nullish()
        .catch(void 0),
      metadata_never_sent: A(o())
        .nullish()
        .catch(void 0),
      metadata_max_wait_ms: E()
        .nullish()
        .catch(void 0),
      cost_report_max_wait_ms: E()
        .nullish()
        .catch(void 0),
      policy_version: o().nullish(),
    }),
  ),
  Ss = 50,
  bs = 90,
  Kt = 120000,
  Yt = 60000,
  ve = 240000,
  Rt = 30000,
  Rs = 5000,
  ks = 1000,
  Es = 256,
  Ts = 2000,
  Ms = 5000,
  As = 1048576,
  Cs = new Set(["Bash", "Write", "Edit", "NotebookEdit", "Agent"]),
  Ps = 256,
  Is = 5000,
  Et = 32,
  He = 32,
  Os = ve,
  xs = 16;
//@ chunk-fp6aqx1j.js:22423-22463 placement
function Ee(e, n) {
  return n === "processed";
}
//@ chunk-fp6aqx1j.js:22463-23833 placement
var FLAG_CONTROL_SUBTYPES = new Set(["apply_flag_settings", "set_max_thinking_tokens", "mcp_set_servers"]),
  SYSTEM_FOREGROUND_SHELL_TASK_ROWS = "system/foreground_shell_task_rows",
  SYSTEM_STATUS_REQUESTING_REPEAT = "system/status_requesting_repeat",
  Jt = "system/status_requesting_repeat_releasing",
  SYSTEM_STATUS_REQUESTING_REPEAT_STARTING = "system/status_requesting_repeat_starting",
  Us = new Set([
    "system/task_summary",
    SYSTEM_FOREGROUND_SHELL_TASK_ROWS,
    SYSTEM_STATUS_REQUESTING_REPEAT,
    Jt,
    SYSTEM_STATUS_REQUESTING_REPEAT_STARTING,
  ]),
  Tt = new Set([
    "rate_limit_event/allowed",
    "system/task_summary",
    "system/post_turn_summary",
    "system/commands_changed",
    "system/permission_check_status",
    "system/hook_started",
    "system/hook_response",
    "system/informational",
    "system/peer_message_hold",
    "system/permission_denied",
    "system/session_metadata",
    "system/session_title_changed",
    "system/per_turn_effort_changed",
    "system/instruction_size_warning",
    "system/slack_tag_title",
    "system/vcs_state_changed",
    "tool_use_summary",
    "system/task_started_foreground_shell",
    "system/task_notification_foreground_shell",
  ]),
  Ws = 32,
  en = new Set(["post_turn_summary", "recap", "context_usage", "rate_limit_info", "task_summary"]),
  Bs = new Set([...en, "last_served_model"]),
  Hs = ve,
  Ns = new Set([
    "context_usage",
    "cross_session_inbound",
    "is_ultraplan_mode",
    "last_served_model",
    "permission_mode",
    "rate_limit_info",
  ]),
  Ne = 57344,
  Ds = 64512,
  Ls = /^[A-Za-z0-9._-]{1,16}$/,
  qs = 30000,
  $s = 2000,
  js = ["none", "write", "all"],
  zs = 64,
  Gs = 50,
  Ks = 5000,
  Vs = !1,
  Ys = 3000,
  Qs = 1e4,
  Ke = (e) => e.ephemeral === !0 || e.payload.type === "keep_alive",
  Mt = (e) => Ke(e) || e.payload.type === "control_response",
  At = () => !1;
//@ chunk-fp6aqx1j.js:23833-23887 placement
function NNo() {
  return env.CLAUDE_CODE_WORKER_EPOCH ?? NaN;
}
//@ chunk-fp6aqx1j.js:23887-24110 placement
var CUMULATIVE_COST_KEYS = [
    "cumulative_cost_usd",
    "cumulative_input_tokens",
    "cumulative_output_tokens",
    "cumulative_cache_read_tokens",
    "cumulative_cache_write_tokens",
  ],
  COST_STATE_METADATA_KEYS = new Set([
    ...CUMULATIVE_COST_KEYS,
    "cost_state",
    "memory_extract_place",
    "model_turn_stored",
  ]);
//@ chunk-fp6aqx1j.js:24110-24253 placement
function pickCostAndModelMetadata(e) {
  return Object.entries(e).filter(
    ([n]) =>
      COST_STATE_METADATA_KEYS.has(n) ||
      n === "last_served_model" ||
      n === "worker_permission_mode" ||
      n === "card_turn_stamp",
  );
}
//@ chunk-fp6aqx1j.js:24253-24313 placement
function ue(e) {
  return 1 + (e < 128 ? 1 : e < 16384 ? 2 : e < 2097152 ? 3 : 4) + e;
}
//@ chunk-fp6aqx1j.js:24313-24601 placement
function estimateJsonEncodedSize(e) {
  if (typeof e === "string") return ue(Buffer.byteLength(e));
  if (typeof e === "number") return 9;
  let n = 0;
  if (Array.isArray(e)) for (let s of e) n += ue(estimateJsonEncodedSize(s));
  else if (isPlainObject(e)) {
    for (let [s, r] of Object.entries(e))
      if (r !== void 0) n += ue(ue(Buffer.byteLength(s)) + ue(estimateJsonEncodedSize(r)));
  } else return 2;
  return ue(n);
}
//@ chunk-fp6aqx1j.js:24601-24700 placement
function Zs(e) {
  let n = e?.error;
  return n?.type === "not_found_error" && n.resource_type === "client_event";
}
//@ chunk-fp6aqx1j.js:24700-24758 placement
function Pt(e, n) {
  return e.toLowerCase() === n.toLowerCase();
}
//@ chunk-fp6aqx1j.js:24758-24974 placement
function describeUploadFailure(e) {
  if (e === 404) return "http_404_unknown_body";
  if (e === 401 || e === 403) return "http_refused";
  if (e === 429) return "http_rate_limited";
  if (e === 501) return "http_not_served";
  return e >= 500 ? "http_server_error" : "http_other";
}
//@ chunk-fp6aqx1j.js:24974-25162 placement
var clientEventSchema = DoctorLazy(() =>
  u({
    event_id: o(),
    source: T("client"),
    created_at: o(),
    payload: kt({ uuid: o() }),
    sent_by_account_id: o().nullish(),
    device_attestation_status: oe().optional(),
    session_agent_owned: M(),
  }),
);
//@ chunk-fp6aqx1j.js:25162-25628 placement
function parseDeliveryEvent(e, n) {
  let safeParse = clientEventSchema().safeParse(e);
  if (!safeParse.success) return { kind: "unavailable", why: "malformed" };
  let { event_id: event_id, created_at: created_at, payload: payload } = safeParse.data,
    parse = Date.parse(created_at);
  if (!Pt(event_id, n) || !Number.isFinite(parse) || !Pt(payload.uuid, n))
    return { kind: "unavailable", why: "malformed" };
  return {
    kind: "event",
    event: {
      eventId: n,
      createdAtMs: parse,
      sentByAccountId: safeParse.data.sent_by_account_id ?? void 0,
      deviceAttestationStatus: safeParse.data.device_attestation_status,
      sessionAgentOwned: safeParse.data.session_agent_owned,
      payload: payload,
    },
  };
}
/**
 * CCRClient：云端 worker 与 CCR 会话服务的客户端：注册 worker（epoch）、心跳、上传事件/状态、接收 served call 与冲突处理（superseded_by_worker、epoch_stale）。
 */
//@ chunk-fp6aqx1j.js:25921-134287 callgraph-witnessed = CCRClient (0.237)
class CCRClient {
  workerEpoch = 0;
  heartbeatIntervalMs;
  heartbeatJitterFraction;
  seedHeartbeatIntervalMs;
  advertiseHeartbeatProbeSupport;
  uploadTrim;
  keepsRequestId;
  uploadHoldMarker;
  shellTaskRowsLiveOnly;
  liveOnlyShellStarts;
  servedCallRequestsJumpQueue;
  maxEventPostTimeoutMs;
  urgentRequestIds = new Set();
  followsServedPolicy;
  launchFlushPolicy;
  processExiting;
  gatesToolCalls;
  toolCallRowGraceMs;
  flushPolicy;
  holdRule;
  settingsRequestIds = new Set();
  waitingAnswers = [];
  waitingAnswersTimer = null;
  lastRateLimitKind;
  seesModelCallBoundaries = !1;
  lastRequestingList;
  turnTookInput = !1;
  housekeepingRequestIds = new Set();
  toolResultEndsCall = !1;
  liveOnlyRequestingRow;
  heldRepeatUuid;
  subAgentWroteSinceStoredRequesting = !1;
  indexBehindHeldToolResult;
  liveOnlyStartingRow;
  turnHold = "open";
  modelTurnEnded = !1;
  recordAtStart;
  reportedKeys = new Set();
  autocompactStateStored;
  stateRowTypesWritten = new Set();
  sessionModelTurnStored = !1;
  resultThatMarks;
  secondCallStartsHold = !1;
  modelCallStreamed = !1;
  streamedResponseId;
  holdsNoMoreThisTurn = !1;
  newestResponseId;
  unansweredCalls = new Set();
  callsWhoseResultsWait = new Set();
  heldResultNeedsStore = !1;
  pickupBarriers = [];
  pickupTakesTick = !1;
  pickupWaitMs;
  inboundMessageUuids = new Set();
  liveTurnId;
  nextLiveIndex = 0;
  heldShellTaskIds = new Set();
  rowsMarkedLiveOnly = new WeakSet();
  artifactSocketIds;
  lastTaskList;
  droppedBeforeLiveTurn = 0;
  lastViewerCheckpointAtMs = 0;
  viewerCheckpointTimer = null;
  shutdownReleased = !1;
  shutdownKeepsClientEvents = !1;
  shutdownBeganAtMs = 0;
  owedMetadataDropsAtShutdown = 0;
  viewerAbsentReported = !1;
  stopToolCallGate;
  keepAliveAtWorkStart;
  stopWorkStartKeepAlive;
  toolCallRows = { client_events: new Map(), internal_events: new Map() };
  toolCallRowWaiters = new Map();
  awaitedToolCalls = new Set();
  transcriptLaneInUse = !1;
  toolCallsWhoseResultReleases = new Set();
  lanesNotAnswering = new Set();
  loggedUnreadableFlushPolicy = !1;
  loggedTranscriptEnvelopeStrip = !1;
  loggedToolResultBlank = !1;
  loggedMcpImageBlank = !1;
  loggedRequestIdKept = !1;
  maxAdvisedIntervalMs;
  beatOnStaleReconnect;
  beatOnReactivation;
  skipRedundantHeartbeats;
  idleTracker;
  unsubscribeIdleTracker;
  probeBeatSpacingMs;
  heartbeatTimer = null;
  heartbeatInFlight = !1;
  lastHeartbeatSentAtMs = 0;
  lastCadenceTickAtMs = 0;
  lastBeatingEventsPostOkAtMs = 0;
  lastEventsAnswerOrPulseAtMs = 0;
  skippedPreviousCadenceBeat = !1;
  lastHeartbeatSuccessAtMs = Date.now();
  heartbeatsSent = 0;
  lastSucceededBeat = 0;
  lastSettledBeat = 0;
  lastHeartbeat429AtMs = 0;
  idleGrantLatched = !1;
  reactivationBeatArmed = !1;
  pendingForcedBeat = !1;
  probeBeatTimer = null;
  pendingBeatTrigger = null;
  closed = !1;
  closeAbort = new AbortController();
  goodbyeFlushed = Promise.resolve();
  leftMidTurn = !1;
  epochSuperseded = !1;
  lastEpochMismatchCause;
  epochMismatchCount = 0;
  consecutiveAuthFailures = 0;
  lastAuthRefreshBadReason = null;
  consecutiveNotFound = 0;
  consecutiveHeartbeatFailures = 0;
  currentState = null;
  reportParkAtInit;
  guardsClientRows;
  hasDisplayHooks = void 0;
  displayHookSeen = !1;
  clientRowsOwed = new TurnLedger();
  ownRowsWaitBehindRowsSentAgainSince = void 0;
  initExternalMetadata;
  initialWorkerStatus;
  initStateGetOrderingBoundMs;
  stateReadEndsAtRegistration;
  startReportsMaxWaitMs;
  startReportsWaitUntilMs = 0;
  parkReportedAtInitRequestId = void 0;
  sessionBaseUrl;
  sessionId;
  readSource;
  streamEventBuffer = [];
  streamEventTimer = null;
  firstFrameUpload;
  firstTextFrameUpload;
  firstBlockFrameUpload;
  countedTextEvents = new WeakSet();
  streamEventBufferedAt = 0;
  streamEventFlushDueAt = 0;
  streamEventFlushIntervalMs = DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS;
  streamEventFirstFlushMs = 0;
  firstDeltaFlushTimer = null;
  firstContentFlushPending = !1;
  toolInputFlushMs = 0;
  toolInputMayWait = !1;
  toolInputChars = 0;
  streamEventTimerIsSlow = !1;
  streamEventsTakenAt = 0;
  loggedToolInputFlush = !1;
  parkedRows = [];
  noSubscriberStreamEventFlushIntervalMs = 0;
  noSubscriberUploadHoldMs = 0;
  closingForSuccessor = !1;
  uploadHoldTally = new HoldStats();
  undeliveredClientEventsAtClose;
  undeliveredInternalEventsAtClose;
  dropUnwatchedStreamEvents = !1;
  lastReportedHasSubscribers;
  lastInboundEventAtMs = Number.NEGATIVE_INFINITY;
  viewerReportedSinceLastFalse = !1;
  lastViewerLeftAtMs = Number.NEGATIVE_INFINITY;
  unwatchedPastGrace = !1;
  hasSubscribersReports = 0;
  streamEventsDroppedUnwatched = 0;
  streamedEphemeralSinceLastAssistant = !1;
  workerState;
  eventUploader;
  workerSocket;
  internalEventUploader;
  ridingRows;
  takenRiders;
  ridesRefused = !1;
  ridesPausedUntilMs = 0;
  routeOnlyFailures = 0;
  ridePauses = 0;
  failedRide;
  loggedRowsLeftOut = !1;
  internalEventPostWatch;
  rowsAwaitingCompactSummary = new Map();
  rowsAwaitingCompactSummaryAtClose;
  onInternalBatchAcked;
  onInternalEventLaneClosed;
  rowsRepeatedAfterCompaction;
  deliveryUploader;
  pendingProcessingAcks = [];
  waitingReceipts = new Map();
  waitingReceiptsTimer;
  messagesInProcessing = new Set();
  resultPostWaits;
  receiptsRide;
  receiptsRideRefused = !1;
  onEpochMismatch;
  lastLineWhen;
  onDurableEventsDropped = void 0;
  onDurableEventsUpload = void 0;
  getAuthHeaders;
  tickets = new TicketHeaders();
  providerWithheldReason;
  onDiagnostic;
  onCardRecordRefused;
  onRequestAuthOk;
  onHeartbeatLost;
  readTransport;
  nonOrigin403Transient;
  nonOriginRuns = new Map();
  heartbeatStreakStartedAtMs = 0;
  heartbeatLostFiredForStreak = !1;
  adoptRefreshedAuth;
  gzipRequestBodyFetch;
  ownConnectionPool;
  constructor(e, n, s) {
    ((this.lastLineWhen = s?.onEpochMismatch ? "queued" : "now"),
      (this.onEpochMismatch =
        s?.onEpochMismatch ??
        (() => {
          process.exit(1);
        })),
      (this.onHeartbeatLost = s?.onHeartbeatLost),
      (this.readTransport = e),
      (this.workerSocket = s?.workerSocket),
      (this.nonOrigin403Transient = s?.nonOrigin403Transient ?? !1),
      (this.heartbeatIntervalMs = s?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS),
      (this.seedHeartbeatIntervalMs = this.heartbeatIntervalMs),
      (this.advertiseHeartbeatProbeSupport = s?.advertiseHeartbeatProbeSupport ?? !1),
      (this.uploadTrim = s?.uploadTrim ?? (() => EMPTY_UPLOAD_TRIM)),
      (this.keepsRequestId = () => s?.keepsRequestId?.() === !0),
      (this.uploadHoldMarker = () => s?.uploadHoldMarker?.() === !0));
    let r = s?.liveOnlyShellTaskRows;
    ((this.shellTaskRowsLiveOnly = r
      ? () => r.enabled() === !0
      : () =>
          this.followsServedPolicy &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_FOREGROUND_SHELL_TASK_ROWS) === !0),
      (this.liveOnlyShellStarts = r?.starts ?? new Map()),
      (this.artifactSocketIds = s?.artifactSocketIds),
      (this.servedCallRequestsJumpQueue = () => s?.servedCallRequestsJumpQueue?.() === !0),
      (this.maxEventPostTimeoutMs = s?.maxEventPostTimeoutMs ?? DEFAULT_MAX_EVENT_POST_TIMEOUT_MS),
      (this.followsServedPolicy = s?.followsServedPolicy === !0),
      (this.keepAliveAtWorkStart = s?.keepAliveAtWorkStart),
      (this.launchFlushPolicy = s?.launchFlushPolicy),
      (this.processExiting = s?.processExiting ?? (() => !1)),
      (this.gatesToolCalls = s?.gatesToolCalls === !0),
      (this.toolCallRowGraceMs = s?.toolCallRowGraceMs ?? $s),
      (this.pickupWaitMs = s?.pickupWaitMs ?? Rs),
      (this.beatOnStaleReconnect = s?.beatOnStaleReconnect ?? !1),
      (this.idleTracker = s?.idleTracker),
      (this.beatOnReactivation = (s?.beatOnReactivation ?? !1) && this.idleTracker !== void 0),
      (this.skipRedundantHeartbeats = s?.skipRedundantHeartbeats ?? !1),
      (this.probeBeatSpacingMs = s?.probeBeatSpacingMs ?? DEFAULT_PROBE_BEAT_SPACING_MS),
      (this.heartbeatJitterFraction = s?.heartbeatJitterFraction ?? 0),
      (this.maxAdvisedIntervalMs = this.maxAdvisedIntervalFor(this.advertiseHeartbeatProbeSupport)),
      (this.getAuthHeaders = s?.getAuthHeaders ?? getSessionIngressAuthHeaders));
    let h = s?.isFirstPartyProvider;
    ((this.providerWithheldReason =
      h === void 0 ? () => "provider-unknown" : () => (h() ? void 0 : "data-residency")),
      (this.onDiagnostic = s?.onDiagnostic),
      (this.onCardRecordRefused = s?.onCardRecordRefused),
      (this.onRequestAuthOk = s?.onRequestAuthOk),
      (this.adoptRefreshedAuth = s?.adoptRefreshedAuth),
      (this.gzipRequestBodyFetch = s?.gzipRequestBodyFetch),
      (this.ownConnectionPool = s?.ownConnectionPool),
      (this.reportParkAtInit = s?.reportParkAtInit ?? !1),
      (this.guardsClientRows = s?.guardsClientRows ?? (() => !1)),
      (this.initExternalMetadata = s?.initExternalMetadata ?? {}),
      (this.initialWorkerStatus = s?.initialWorkerStatus ?? "idle"),
      (this.initStateGetOrderingBoundMs = s?.initStateGetOrderingBoundMs ?? ds),
      (this.stateReadEndsAtRegistration = s?.stateReadEndsAtRegistration ?? !1),
      (this.startReportsMaxWaitMs = s?.startReportsMaxWaitMs ?? Ts),
      (this.readSource = {
        ...convertWsUrlToPostUrl(n, this.getAuthHeaders),
        isClosed: () => this.closed,
        onConflict: (v) => this.handleEpochMismatch(v),
        ownConnectionPool: this.ownConnectionPool,
      }),
      (this.sessionBaseUrl = this.readSource.sessionBaseUrl),
      (this.sessionId = n.pathname.replace(/\/$/, "").split("/").pop() || ""),
      (this.workerState = new WorkerStateUploader({
        send: async (v) => {
          let y =
              this.clientRowsOwed.writesNoMore && isPlainObject(v.internal_metadata)
                ? { ...v, internal_metadata: Uo(v.internal_metadata, "client_rows_owed") }
                : v,
            request = await this.request(
              "put",
              "/worker",
              { worker_epoch: this.workerEpoch, ...y },
              "PUT worker",
            );
          if (request.ok) {
            if (y.worker_status !== void 0) logFeatureOk("ccr_worker_state_publish");
            return !0;
          }
          if (this.closed && request.status === 409) {
            if (
              (logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", { status: request.status }),
              this.droppedWorkerStatePatchCount++,
              this.workerState.keepsWithoutStatus(y))
            )
              this.droppedOwedMetadataPatchCount++;
            return !0;
          }
          if (se(request.status)) {
            if (
              (logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", { status: request.status }),
              this.droppedWorkerStatePatchCount++,
              this.workerState.keepsWithoutStatus(y))
            )
              this.droppedOwedMetadataPatchCount++;
            if (isPlainObject(y.internal_metadata) && "client_rows_owed" in y.internal_metadata)
              (logFeatureSad("ccr_client_rows_owed", "report_with_note_refused", { status: request.status }),
                this.clientRowsOwed.reportWithNoteRefused());
            let C = isPlainObject(y.internal_metadata) ? y.internal_metadata : {},
              U = isPlainObject(y.external_metadata) ? y.external_metadata : {};
            if (isPlainObject(U.pending_action)) this.onCardRecordRefused?.(request.status, y);
            let { internal_metadata: internal_metadata, external_metadata: external_metadata, ...W } = y,
              x = pickCostAndModelMetadata(C),
              z = pickCostAndModelMetadata(U);
            if (
              (x.length > 0 && z.length > 0) ||
              (x.length + z.length > 0 &&
                x.length + z.length < Object.keys(W).length + Object.keys(C).length + Object.keys(U).length)
            )
              this.workerState.requeueMetadata({
                ...(x.length > 0 && { internal_metadata: Object.fromEntries(x) }),
                ...(z.length > 0 && { external_metadata: Object.fromEntries(z) }),
              });
            if (y.worker_status !== void 0) {
              let K = {
                worker_status: y.worker_status,
                ...("requires_action_details" in y && { requires_action_details: y.requires_action_details }),
                ...("reply_degraded" in C && { internal_metadata: { reply_degraded: C.reply_degraded } }),
              };
              if (Object.keys(y).length > Object.keys(K).length || Object.keys(C).length > 1)
                return (this.workerState.requeueStatus(K), !0);
              logFeatureSad("ccr_worker_state_publish", "state_4xx_dropped");
            }
            return !0;
          }
          return !1;
        },
        baseDelayMs: 500,
        maxDelayMs: 30000,
        jitterMs: 500,
        ridesAStatus: ["reply_degraded", "card_turn_stamp"],
        mergesSameRun: () => this.flushPolicy?.mergeWorkerReports === !0 && this.followsServedPolicy,
        waitsForStatus: (v) => {
          let flushPolicy = this.flushPolicy,
            {
              external_metadata: external_metadata = {},
              internal_metadata: internal_metadata = {},
              ...U
            } = v;
          if (
            !flushPolicy ||
            !this.followsServedPolicy ||
            Object.keys(U).length > 0 ||
            !isPlainObject(external_metadata) ||
            !isPlainObject(internal_metadata) ||
            [...Object.values(external_metadata), ...Object.values(internal_metadata)].includes(null)
          )
            return !1;
          let S = this.startReportsWaitUntilMs - performance.now();
          if (
            flushPolicy.mergeWorkerReports &&
            S > 0 &&
            this.inboundMessageUuids.size > 0 &&
            !("worker_permission_mode" in internal_metadata)
          )
            return S;
          if (
            this.currentState !== "running" ||
            !Object.keys(external_metadata).every((P) => flushPolicy.metadataWaitsForStatus.has(P)) ||
            !Object.keys(internal_metadata).every(
              (P) => flushPolicy.costReportMaxWaitMs > 0 && COST_STATE_METADATA_KEYS.has(P),
            )
          )
            return !1;
          if (Object.keys(internal_metadata).length > 0) return flushPolicy.costReportMaxWaitMs;
          return Object.keys(external_metadata).length > 0;
        },
      })),
      (this.eventUploader = new ClientEventUploader({
        maxBatchSize: 100,
        maxBatchBytes: () => Math.min(10 * ONE_MIB, this.workerSocket?.maxBatchBytes() ?? 1 / 0),
        maxQueueSize: 1e5,
        send: this.settlesTakenRiders(async (v, y) => {
          let O = dedupeEventsByUuid(v);
          if (O > 0)
            logForDebugging(`CCRClient: dropped ${O} repeated-uuid durable event(s) from one live-view POST`);
          let C = y.urgent ? void 0 : this.ridingRows,
            failedRide = this.failedRide;
          if (
            ((this.failedRide = void 0),
            C &&
              (this.ridesAreOff() ||
                v.every((N) => Ke(N) || N.payload.type === "control_response") ||
                y.bytes + C.bytes >
                  Math.min(MAX_EVENT_BATCH_BYTES, this.workerSocket?.maxBatchBytes() ?? 1 / 0)))
          )
            (this.giveBackRidingRows(), (C = void 0));
          if (C) ((this.ridingRows = void 0), (this.takenRiders = C));
          let S = !y.urgent && !v.every(Mt);
          if (
            S &&
            this.receiptsMayRide() &&
            this.messagesInProcessing.size > 0 &&
            v.some((N) => N.payload.type === "result")
          )
            (await new Promise((N) => {
              ((this.resultPostWaits = N), setImmediate(N));
            }),
              (this.resultPostWaits = void 0),
              this.messagesInProcessing.clear());
          let P =
              S && this.receiptsMayRide()
                ? [...this.waitingReceipts]
                    .filter(([N, q]) => q === "processed" && Vt(N) !== null)
                    .slice(0, xs)
                    .map(([N]) => N)
                : [],
            W = C ? { ...y, bytes: y.bytes + C.bytes } : y,
            x = computeEventPostTimeoutMs(W, {
              maxMs: this.maxEventPostTimeoutMs,
              minMs: v.some(Yn)
                ? URGENT_EVENT_POST_TIMEOUT_MS
                : y.followsUrgent
                  ? Math.min(URGENT_EVENT_POST_TIMEOUT_MS, this.maxEventPostTimeoutMs)
                  : void 0,
            });
          this.reportDurableUpload(v, "sending");
          let actsOnSubscribersReports = this.actsOnSubscribersReports(),
            K =
              actsOnSubscribersReports ||
              this.onSubscribersReported !== void 0 ||
              C !== void 0 ||
              P.length > 0,
            hasSubscribersReports = this.hasSubscribersReports,
            R = [];
          for (let N of this.trackedFrameUploads("ackedAtMs"))
            if (v.some((q) => q.payload.uuid === N.uuid)) R.push(N.timing);
          for (let N of R)
            if (N.postedAtMs === void 0) ((N.postedAtMs = performance.now()), (N.postedWallMs = Date.now()));
          let B = this.firstTextFrameUpload?.timing;
          if (B?.postedAtMs !== void 0 && markTextDeltaRows(v, this.countedTextEvents))
            recordTextPost(B, performance.now());
          let L;
          try {
            L = await this.request(
              "post",
              C ? EVENT_BATCH_PATH : "/worker/events",
              {
                ...this.uploadBody(v, y),
                ...(C && { worker_events: C.rows }),
                ...(P.length > 0 && {
                  delivery_updates: P.map((N) => ({ event_id: N, status: "processed" })),
                }),
              },
              "client events",
              { timeout: x, parseBody: K, uploadAttempt: y.attempt },
            );
          } catch (error) {
            throw (C?.settle(!1), error);
          } finally {
            if (P.length > 0) {
              let takeWaitingReceipts = this.takeWaitingReceipts((q) => P.includes(q));
              if (!L?.ok || L.data?.delivery_updates_applied !== !0)
                this.queueDeliveryAcks(takeWaitingReceipts);
            }
          }
          let I = L.ok ? L.data?.worker_results : void 0,
            G = Array.isArray(I) && I.length === C?.rows.length;
          if ((C?.settle(G), C !== void 0 && L.ok)) ((this.routeOnlyFailures = 0), (this.ridePauses = 0));
          let X = L.ok ? 200 : L.status,
            Q = C !== void 0 && L.ok && isPlainObject(L.data) && I === void 0;
          if (
            (C || P.length > 0) &&
            !L.ok &&
            (se(X) || (C !== void 0 && BATCH_UNSUPPORTED_STATUSES.has(X)))
          ) {
            if (
              ((L = await this.request(
                "post",
                "/worker/events",
                this.uploadBody(v, y),
                "client events (resent without worker_events and delivery_updates)",
                { timeout: x, parseBody: K, uploadAttempt: "resend" },
              )),
              L.ok && X !== 413)
            ) {
              if (C !== void 0 && se(X)) Q = !0;
              else if (C !== void 0) this.noteRouteOnlyFailure(X);
              if (P.length > 0 && se(X))
                ((this.receiptsRideRefused = !0),
                  logForDiagnosticsNoPII("warn", "cli_ccr_receipts_ride_turned_off", { status: X }));
            }
          } else if (C !== void 0) {
            if (!L.ok) this.failedRide = { status: X };
          } else if (failedRide !== void 0 && L.ok) this.noteRouteOnlyFailure(failedRide.status);
          if (Q)
            ((this.ridesRefused = !0),
              logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_turned_off", { status: X }));
          else if (C && X === 200 && !G && !this.loggedRowsLeftOut)
            ((this.loggedRowsLeftOut = !0),
              logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_rows_left_out"));
          if (L.ok) {
            for (let q of R) if (q.ackedAtMs === void 0) q.ackedAtMs = performance.now();
            let N = detectTaskBookends(v);
            if (N) logFeatureOk("ccr_task_status_publish", N);
            if (
              (this.noteBeatingEventsPostOk(v),
              this.reportDurableUpload(v, "accepted"),
              this.noteToolCallRowsSettled("client_events", "stored", v),
              this.noteClientRowsSettled("stored", v),
              actsOnSubscribersReports && hasSubscribersReports === this.hasSubscribersReports)
            )
              this.setHasSubscribers(L.data?.has_subscribers, "no_report");
            this.tellSubscribersReported(L.data?.has_subscribers);
            return;
          }
          if ((this.reportDurableUpload(v, St(L.status)), se(L.status))) {
            let filtered = v.filter((ee) => !ee.ephemeral),
              q = v.length - filtered.length,
              status = L.status;
            if (q > 0) {
              if (
                (logForDebugging(
                  `CCRClient: client event POST rejected (${L.status}) \u2014 dropping ${q} ephemeral event(s), retrying ${filtered.length} durable event(s)`,
                  { level: "warn" },
                ),
                logFeatureSad("ccr_partial_messages", "ephemeral_dropped_on_4xx", {
                  status: L.status,
                  count: q,
                }),
                v.splice(0, v.length, ...filtered),
                logForDiagnosticsNoPII("warn", "cli_worker_events_4xx_ephemeral_dropped", {
                  status: L.status,
                  count: q,
                }),
                filtered.length === 0)
              )
                return;
              this.reportDurableUpload(filtered, "sending");
              let request = await this.request(
                "post",
                "/worker/events",
                this.uploadBody(filtered, y),
                "client events (durable retry)",
                { timeout: x, uploadAttempt: "resend" },
              );
              if (request.ok) {
                let ie = detectTaskBookends(filtered);
                if (ie) logFeatureOk("ccr_task_status_publish", ie);
                (this.noteBeatingEventsPostOk(filtered),
                  this.reportDurableUpload(filtered, "accepted"),
                  this.noteToolCallRowsSettled("client_events", "stored", filtered),
                  this.noteClientRowsSettled("stored", filtered));
                return;
              }
              if ((this.reportDurableUpload(filtered, St(request.status)), !se(request.status)))
                throw request.fetchFailed
                  ? this.retrySmaller("client_events", filtered, y, x, {
                      bytes: filtered.reduce((ie, he) => ie + Buffer.byteLength(jsonStringify(he)), 0),
                    })
                  : new q6e("client event POST failed", request.retryAfterMs);
              status = request.status;
            }
            if (filtered.length > 0) {
              (this.droppedDurableEventBatches++,
                (this.lastRateLimitKind = void 0),
                (this.lastTaskList = void 0),
                this.noteToolCallRowsSettled("client_events", "dropped", filtered),
                this.noteClientRowsSettled("dropped", filtered));
              try {
                this.onDurableEventsDropped?.(filtered, status);
              } catch (error) {
                logForDebugging(
                  `CCRClient: onDurableEventsDropped threw; batch still dropped: ${errorMessage(error)}`,
                  { level: "warn" },
                );
              }
            }
            logForDiagnosticsNoPII("warn", "cli_worker_events_4xx_dropped", {
              status: status,
              count: filtered.length,
              ...describeSingleRowForTelemetry(filtered),
            });
            let Z = detectTaskBookends(filtered);
            if (Z) logFeatureBad("ccr_task_status_publish", "status_events_4xx_dropped", Z);
            return;
          }
          if ((this.rowsSentAgainStepAside(v), v.length === 0)) return;
          if (L.fetchFailed) throw this.retrySmaller("client_events", v, y, x);
          if (X === void 0 && L.reason === "no_auth_headers") throw new ugr("client event POST not sent");
          throw new q6e("client event POST failed", L.retryAfterMs);
        }),
        baseDelayMs: 500,
        maxDelayMs: 30000,
        jitterMs: 500,
        onHoldRelease: this.logUploadHoldEnd.bind(this, "client_events"),
        onDrained: this.logUploadDrain.bind(this, "client_events"),
        onIdle: () => {
          if ((this.giveBackRidingRows(), this.receiptsRide)) this.sendWaitingReceipts(Ee);
        },
      })));
    let w = s?.internalEventUploader;
    ((this.internalEventUploader = new ClientEventUploader({
      maxBatchSize: 100,
      maxBatchBytes: () =>
        w?.maxBatchBytes ?? Math.min(10 * ONE_MIB, this.workerSocket?.maxBatchBytes() ?? 1 / 0),
      maxQueueSize: 200,
      maxConsecutiveFailures: w?.maxConsecutiveFailures,
      onBatchDropped: (v, y) => {
        (this.droppedInternalEventBatches++,
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_give_up_dropped", {
            count: v,
            consecutive_failures: y,
          }),
          logEvent("tengu_ccr_internal_events_dropped", {
            reason: lit("give_up"),
            count: v,
            consecutive_failures: y,
          }));
      },
      send: async (v, y) => {
        let dropOrphanedHandedOffLines = this.dropOrphanedHandedOffLines(v);
        if (dropOrphanedHandedOffLines > 0) {
          if (
            (logForDiagnosticsNoPII("warn", "cli_worker_internal_events_handoff_orphans_dropped", {
              count: dropOrphanedHandedOffLines,
            }),
            logEvent("tengu_ccr_internal_events_dropped", {
              reason: lit("handoff_orphan"),
              count: dropOrphanedHandedOffLines,
            }),
            v.length === 0)
          )
            return;
        }
        let startTime = performance.now(),
          U = computeEventPostTimeoutMs(y, { maxMs: this.maxEventPostTimeoutMs, minMs: w?.requestTimeoutMs }),
          offerToEventsPost = this.offerToEventsPost(v, y),
          P =
            offerToEventsPost && (await offerToEventsPost)
              ? { ok: !0 }
              : await this.request(
                  "post",
                  "/worker/internal-events",
                  this.uploadBody(v, y),
                  "internal events",
                  { timeout: U, uploadAttempt: y.attempt },
                );
        if ((this.markInternalEventPostWatch((W) => W.noteAttempt(v, startTime, P.ok)), P.ok)) {
          (this.noteToolCallRowsSettled("internal_events", "stored", v),
            Promise.resolve()
              .then(() => this.onInternalBatchAcked?.(v))
              .catch(() => {}));
          return;
        }
        if (se(P.status) && dropOrphanedHandedOffLines === 0 && y.mayResendInTwo())
          throw (
            logEvent("tengu_ccr_internal_events_refused_will_split", { count: v.length, status: P.status }),
            new fgr()
          );
        if (se(P.status)) {
          (this.droppedInternalEventBatches++,
            this.noteRefusedInternalEvents(v),
            this.noteToolCallRowsSettled("internal_events", "dropped", v),
            logForDiagnosticsNoPII("warn", "cli_worker_internal_events_4xx_dropped", {
              status: P.status,
              count: v.length,
              ...describeSingleRowForTelemetry(v),
            }),
            logEvent("tengu_ccr_internal_events_dropped", {
              reason: lit("4xx"),
              count: v.length,
              status: P.status,
            }));
          let W = count(
            v,
            (x) => isAssistantWithMessageId(x.payload) && typeof x.payload.requestId === "string",
          );
          if (this.loggedRequestIdKept && W > 0)
            logFeatureBad("ccr_worker_error_request_id_kept", `upload_refused_${P.status}`, {
              count: W,
              status: P.status,
            });
          return;
        }
        if (P.fetchFailed) throw this.retrySmaller("internal_events", v, y, U);
        if (P.reason === "no_auth_headers") throw new ugr("internal event POST not sent");
        throw new q6e("internal event POST failed", P.nonOriginRefusal ? yt : P.retryAfterMs);
      },
      baseDelayMs: 500,
      maxDelayMs: yt,
      jitterMs: 500,
      holdMaxItems: 50,
      gatherTick: !0,
      onHoldRelease: this.logUploadHoldEnd.bind(this, "internal_events"),
      onDrained: this.logUploadDrain.bind(this, "internal_events"),
    })),
      (this.deliveryUploader = new ClientEventUploader({
        maxBatchSize: 64,
        maxQueueSize: 64,
        send: async (v) => {
          let request = await this.request(
            "post",
            "/worker/events/delivery",
            {
              worker_epoch: this.workerEpoch,
              updates: v.map((O) => ({ event_id: O.eventId, status: O.status })),
            },
            "delivery batch",
          );
          if (request.ok) return;
          if (se(request.status)) {
            (logForDiagnosticsNoPII("warn", "cli_worker_delivery_4xx_dropped", {
              status: request.status,
              count: v.length,
            }),
              this.droppedDeliveryAckBatches++);
            return;
          }
          throw new q6e("delivery POST failed", request.retryAfterMs);
        },
        baseDelayMs: 500,
        maxDelayMs: 30000,
        jitterMs: 500,
      })),
      this.setStreamEventFlushIntervalMs(s?.streamEventFlushIntervalMs),
      this.setStreamEventFirstFlushMs(s?.streamEventFirstFlushMs),
      this.setToolInputFlushMs(s?.toolInputFlushMs),
      this.setNoSubscriberStreamEventFlushIntervalMs(s?.noSubscriberStreamEventFlushIntervalMs),
      this.setNoSubscriberUploadHoldMs(s?.noSubscriberUploadHoldMs),
      this.setDropUnwatchedStreamEvents(s?.dropUnwatchedStreamEvents),
      e.setOnEvent((v) => {
        if (this.processExiting() && Xe(v)) return;
        this.noteSettingsRequest(v.payload);
        let y =
          isPlainObject(v.payload) && v.payload.type === "control_request" && isPlainObject(v.payload.request)
            ? v.payload.request.subtype
            : void 0;
        if (HOUSEKEEPING_CONTROL_SUBTYPES.has(y)) {
          for (let O of [v.event_id, v.payload.uuid])
            if (typeof O === "string") (this.housekeepingRequestIds.add(O), ce(this.housekeepingRequestIds));
        }
        this.reportDelivery(
          v.event_id,
          "received",
          isPlainObject(v.payload) && v.payload.type === "user" && typeof v.payload.uuid === "string"
            ? v.payload.uuid
            : void 0,
          {
            controlTraffic: isRelayableControlFrame(v.payload),
            settingsRequest: FLAG_CONTROL_SUBTYPES.has(y),
          },
        );
      }),
      e.setOnHeartbeatProbe(() => {
        (this.setHasSubscribers(void 0, "reset"), this.heartbeatNow("probe"));
      }),
      e.setOnCheckpointRequest(() => this.checkpointForViewer("watcher")),
      e.setOnReconnected(() => {
        if ((this.resyncAfterReconnect(), s?.onStreamReconnected?.(), this.holdsAcrossModelCalls()))
          this.checkpointForViewer("reconnect");
      }),
      (this.unsubscribeIdleTracker = this.beatOnReactivation
        ? this.idleTracker?.onActivity(() => this.sendReactivationBeat())
        : void 0));
  }
  maxAdvisedIntervalFor(e) {
    return e ? Math.floor(ec / (1 + this.heartbeatJitterFraction)) : DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS;
  }
  setFeatureGatedOptions({
    advertiseHeartbeatProbeSupport: advertiseHeartbeatProbeSupport,
    beatOnStaleReconnect: beatOnStaleReconnect,
    beatOnReactivation: beatOnReactivation,
    skipRedundantHeartbeats: skipRedundantHeartbeats,
  }) {
    ((this.advertiseHeartbeatProbeSupport = advertiseHeartbeatProbeSupport),
      (this.maxAdvisedIntervalMs = this.maxAdvisedIntervalFor(advertiseHeartbeatProbeSupport)),
      (this.beatOnStaleReconnect = beatOnStaleReconnect),
      (this.skipRedundantHeartbeats = skipRedundantHeartbeats));
    let h = beatOnReactivation && this.idleTracker !== void 0;
    if (h !== this.beatOnReactivation)
      ((this.beatOnReactivation = h),
        this.unsubscribeIdleTracker?.(),
        (this.unsubscribeIdleTracker =
          h && !this.closed ? this.idleTracker?.onActivity(() => this.sendReactivationBeat()) : void 0));
  }
  async initialize(e) {
    let now = Date.now();
    if (Object.keys(this.getAuthHeaders()).length === 0) throw new CCRInitError("no_auth_headers");
    if (e === void 0) e = NNo();
    if (isNaN(e)) throw new CCRInitError("missing_epoch");
    if (((this.workerEpoch = e), !this.flushPolicy)) this.takeUpFlushPolicy(void 0);
    let abortController = new AbortController(),
      r = !1,
      abortController_2 = new AbortController(),
      workerState = this.getWorkerState(
        "worker_state",
        !1,
        AbortSignal.any([this.closeAbort.signal, abortController.signal]),
      ),
      winner = await Promise.race([
        workerState.then(
          (I) => ((r = !0), I.metadata),
          () => ((r = !0), { external: null, internal: null, readFailed: !0 }),
        ),
        sleep(this.initStateGetOrderingBoundMs, abortController_2.signal).then(() => "pending"),
      ]);
    abortController_2.abort();
    let y = this.reportParkAtInit ? resolveWorkerRequiresActionState(winner) : void 0,
      O = this.followsServedPolicy ? this.flushPolicy?.metadataNeverSent : void 0,
      C = { ...this.initExternalMetadata, ...Object.fromEntries(Array.from(O ?? [], (I) => [I, null])) },
      U = {
        worker_status: "idle",
        worker_epoch: this.workerEpoch,
        external_metadata: { ...C, task_summary: null },
      },
      S =
        y === void 0
          ? {
              worker_status: this.initialWorkerStatus,
              worker_epoch: this.workerEpoch,
              external_metadata: { ...C, pending_action: null, pending_actions: null, task_summary: null },
            }
          : y.status === "requires_action"
            ? { ...U, worker_status: "requires_action", requires_action_details: y.details }
            : U,
      P = { ok: !1 },
      W = new Set(),
      x = 10,
      z = 0;
    for (let I = 1; I <= x; I++) {
      if (this.closed) break;
      if (((z = I), (P = await this.request("put", "/worker", S, "PUT worker (init)")), P.ok || this.closed))
        break;
      if (P.reason) W.add(P.reason);
      if (
        (this.onDiagnostic?.(
          `PUT /worker failed (${P.reason ?? "unknown"}) attempt=${I}/${x}, ${Math.round((Date.now() - now) / 1000)}s elapsed`,
          "warn",
          "worker_registration_attempt_failed",
        ),
        se(P.status))
      ) {
        if (y?.status === "requires_action") {
          ((y = { status: "idle", reason: "park_rejected" }), (S = U), I--);
          continue;
        }
        break;
      }
      if (I < x) {
        let G = Math.min(500 * 2 ** (I - 1), 30000) + Math.random() * 500;
        await sleep(G);
      }
    }
    if (!P.ok) {
      if (!this.closed)
        (logForDiagnosticsNoPII("error", "cli_worker_init_put_retries_exhausted"),
          this.onDiagnostic?.(
            `PUT /worker retries exhausted: ${z} attempts over ${Math.round((Date.now() - now) / 1000)}s, errors=[${[...W].join(",") || "unknown"}]`,
            "warn",
            "worker_registration_gave_up",
          ));
      throw new CCRInitError("worker_register_failed", P.status);
    }
    ((this.currentState = y?.status ?? this.initialWorkerStatus),
      (this.startReportsWaitUntilMs =
        this.currentState === "idle" ? performance.now() + this.startReportsMaxWaitMs : 0));
    let { worker_epoch: worker_epoch, ...Y } = S;
    if (
      (this.workerState.remember(Y),
      this.applyUploadHold("idle"),
      (this.parkReportedAtInitRequestId = y?.status === "requires_action" ? y.requestId : void 0),
      this.startHeartbeat(),
      !this.closed)
    ) {
      setActivityCallback(() => {
        this.writeEvent({ type: "keep_alive" });
      });
      let keepAliveAtWorkStart = this.keepAliveAtWorkStart;
      if (keepAliveAtWorkStart)
        this.stopWorkStartKeepAlive = onWorkStarted(() => {
          try {
            if (Date.now() - this.lastEventsAnswerOrPulseAtMs >= Rt && keepAliveAtWorkStart())
              ((this.lastEventsAnswerOrPulseAtMs = Date.now()), this.writeEvent({ type: "keep_alive" }));
          } catch (error) {
            logError(error);
          }
        });
      if (this.gatesToolCalls) this.stopToolCallGate = Jli((G) => this.gateToolCall(G));
    }
    if (
      (logForDebugging(`CCRClient: initialized, epoch=${this.workerEpoch}`),
      logForDiagnosticsNoPII("info", "cli_worker_lifecycle_initialized", {
        epoch: this.workerEpoch,
        duration_ms: Date.now() - now,
        reported_status: this.currentState,
      }),
      Br("worker_init_ms", Date.now() - now, now - performance.timeOrigin),
      y)
    )
      logEvent("tengu_ccr_init_park_report", { reported: fromEnum(y.status), reason: fromEnum(y.reason) });
    let R = this.stateReadEndsAtRegistration && !r;
    if (R) abortController.abort();
    let { metadata: metadata, durationMs: durationMs } = await workerState;
    if (this.stateReadEndsAtRegistration && metadata.readFailed)
      logForDebugging(
        "CCRClient: GET /worker had not succeeded when the worker registered; continuing without the stored worker state",
        { level: "warn" },
      );
    if (
      (this.clientRowsOwed.workerRecordRead(metadata, new Date()),
      this.clientRowsOwed.spansGivenUpAtStart > 0)
    )
      logFeatureBad("ccr_client_rows_owed", "gave_up_after_tries", {
        spans: this.clientRowsOwed.spansGivenUpAtStart,
      });
    if (((this.sessionModelTurnStored = metadata.internal?.model_turn_stored === !0), !metadata.readFailed))
      this.recordAtStart = { ...metadata.external, ...C };
    if (!this.closed)
      logForDiagnosticsNoPII("info", "cli_worker_state_restored", {
        duration_ms: durationMs,
        had_state: metadata.external !== null || metadata.internal !== null,
        read_failed: metadata.readFailed === !0,
        read_abandoned_at_registration: R && metadata.readFailed === !0,
      });
    return y ? { ...metadata, initParkReport: notifySessionStateChanged(y.status, metadata) } : metadata;
  }
  async getWorkerState(e = "worker_state", n = !1, s = this.closeAbort.signal) {
    let now = Date.now(),
      authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0)
      return {
        metadata: { external: null, internal: null, readFailed: !0 },
        projectsAssertion: void 0,
        durationMs: 0,
      };
    let withRetry = await CCRClient.getWithRetry(
      this.readSource,
      `${this.sessionBaseUrl}/worker${Wt(n)}`,
      authHeaders,
      e,
      void 0,
      void 0,
      { signal: s },
    );
    return {
      metadata: {
        external: withRetry?.worker?.external_metadata ?? null,
        internal: withRetry?.worker?.internal_metadata ?? null,
        ...(withRetry === null && { readFailed: !0 }),
      },
      projectsAssertion: Bt(withRetry),
      durationMs: Date.now() - now,
    };
  }
  get currentWorkerEpoch() {
    return this.workerEpoch;
  }
  readOwnClientEvent(e) {
    return CCRClient.readOwnClientEventFrom(this.readSource, e);
  }
  static async readOwnClientEventFrom(e, n) {
    let s = `${e.sessionBaseUrl}/worker/events/${encodeURIComponent(n.toLowerCase())}`,
      r = { kind: "unavailable", why: "network" };
    for (let h = 1; h <= WORKER_STATE_MAX_ATTEMPTS; h++) {
      let w;
      try {
        w = e.getAuthHeaders();
      } catch {
        return { kind: "unavailable", why: "no_auth_headers" };
      }
      if (Object.keys(w).length === 0) return { kind: "unavailable", why: "no_auth_headers" };
      let v;
      try {
        v = await proxyAwareFetch(
          s,
          {
            headers: {
              ...w,
              "anthropic-version": "2023-06-01",
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
            },
            signal: AbortSignal.timeout(1e4),
            ...getProxyFetchOptions({ url: s }),
          },
          e.ownConnectionPool,
        );
      } catch {
        r = { kind: "unavailable", why: "network" };
      }
      if (v !== void 0) {
        let y = await v.json().catch(() => {
          return;
        });
        if (v.ok) return parseDeliveryEvent(y, n);
        if (v.status === 404 && Zs(y)) return { kind: "absent" };
        if (
          ((r = { kind: "unavailable", why: describeUploadFailure(v.status) }),
          v.status < 500 || v.status === 501)
        )
          return r;
      }
      if (h < WORKER_STATE_MAX_ATTEMPTS)
        await sleep(Math.min(500 * 2 ** (h - 1), 4000) + Math.random() * 500);
    }
    return r;
  }
  async readProjectsBinding() {
    let { metadata: metadata, projectsAssertion: projectsAssertion } = await this.getWorkerState(
      "projects_binding",
      !0,
    );
    return metadata.readFailed ? { read: !1 } : { read: !0, assertion: projectsAssertion };
  }
  async readWorkerState() {
    return (await this.getWorkerState("worker_state_reread")).metadata;
  }
  static async readProjectsBindingFor(e, n) {
    let s = convertWsUrlToPostUrl(e, n);
    if (Object.keys(n()).length === 0) return { read: !1 };
    let withRetry = await CCRClient.getWithRetry(
      s,
      `${s.sessionBaseUrl}/worker${Wt(!0)}`,
      n(),
      "projects_binding",
    );
    return withRetry === null ? { read: !1 } : { read: !0, assertion: Bt(withRetry) };
  }
  request(e, n, s, r, h = {}) {
    return this.sendRequest(e, n, s, r, h);
  }
  async sendRequest(
    e,
    n,
    s,
    r,
    {
      timeout: timeout = MIN_EVENT_POST_TIMEOUT_MS,
      parseBody: parseBody = !1,
      countTowardEscalation: countTowardEscalation = !0,
      signal: signal,
      onLateSocketAnswer: onLateSocketAnswer,
      uploadAttempt: uploadAttempt,
    },
  ) {
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) return { ok: !1, reason: "no_auth_headers" };
    let S = `${this.sessionBaseUrl}${n}`,
      P = signal ? createCombinedAbortSignal(signal, { timeoutMs: timeout, refTimer: !0 }) : void 0,
      W = !1,
      Authorization = authHeaders.Authorization;
    try {
      let z = jsonStringify(s),
        startTime = performance.now(),
        Y = signal
          ? void 0
          : n === "/worker/heartbeat"
            ? this.workerSocket?.beat(z, timeout, (Q) => onLateSocketAnswer?.(Q))
            : this.workerSocket?.carry(n, z, timeout),
        R = Y && (await Y),
        B = R;
      if (!B) {
        if (Y && n === "/worker/heartbeat" && this.closed) return { ok: !1, reason: "closed" };
        let Q = {
          method: e.toUpperCase(),
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "anthropic-client-platform": getClientPlatform(),
            "User-Agent": claudeCodeUserAgent(),
            ...(uploadAttempt !== void 0 && { [X_CCR_UPLOAD_ATTEMPT]: uploadAttempt }),
          },
          body: z,
          signal: P?.signal ?? AbortSignal.timeout(timeout),
          ...getProxyFetchOptions({ url: S }),
        };
        if (Y) {
          let N = {};
          try {
            N = this.getAuthHeaders();
          } catch (error) {
            logForDebugging(
              `CCRClient: could not read credentials again for a request the worker socket handed to POST: ${errorMessage(error)}`,
              { level: "warn" },
            );
          }
          if (Object.keys(N).length > 0) {
            let headers = Q.headers;
            for (let j of Object.keys(authHeaders)) delete headers[j];
            (Object.assign(headers, N), (Authorization = N.Authorization));
          }
          Q.signal = AbortSignal.timeout(
            n === "/worker/heartbeat" ? Math.max(0, timeout - (performance.now() - startTime)) : timeout,
          );
        }
        (Object.assign(Q.headers, this.tickets.headersFor(Authorization)),
          (B = this.gzipRequestBodyFetch
            ? await this.gzipRequestBodyFetch(S, Q, (N) => proxyAwareFetch(S, N, this.ownConnectionPool))
            : await proxyAwareFetch(S, Q, this.ownConnectionPool)));
      }
      if (((W = !0), !R)) this.tickets.note(Authorization, B);
      if (B.ok) {
        ((this.consecutiveAuthFailures = 0),
          (this.consecutiveNotFound = 0),
          this.reportNonOriginRun("onCleared", ENDPOINT_CATEGORIES[n]),
          this.nonOriginRuns.delete(ENDPOINT_CATEGORIES[n]));
        for (let Q of this.nonOriginRuns.values()) Q.othersPassed = !0;
        if (parseBody)
          try {
            return { ok: !0, data: await B.json() };
          } catch {
            return { ok: !0 };
          }
        return (await drainResponseBody(B), { ok: !0 });
      }
      let L;
      if (B.status === 409 && !this.closed) L = await readConflictReason(B);
      else await drainResponseBody(B);
      if (this.closed) return { ok: !1, status: B.status, reason: `http_${B.status}` };
      if (B.status === 409) this.handleEpochMismatch(L);
      if (B.status === 404 && countTowardEscalation && n !== EVENT_BATCH_PATH) {
        if ((this.consecutiveNotFound++, this.consecutiveNotFound >= MAX_CONSECUTIVE_NOT_FOUND))
          (logForDebugging(
            `CCRClient: ${this.consecutiveNotFound} consecutive 404s \u2014 session gone, exiting`,
            { level: "error" },
          ),
            logForDiagnosticsNoPII("error", "cli_worker_session_not_found", void 0, this.lastLineWhen),
            this.onDiagnostic?.(
              `${this.consecutiveNotFound} consecutive 404s on ${n} \u2014 session gone, exiting`,
              "warn",
              "session_not_found",
            ),
            this.escalateEpochMismatch("session_not_found"));
      }
      let I = B.status !== 403 ? void 0 : R ? "origin" : readRequestIdSource((Q) => B.headers.get(Q)),
        nonOrigin403Transient = this.nonOrigin403Transient,
        X = nonOrigin403Transient !== !1 && v5e(I);
      if (X && typeof nonOrigin403Transient === "object") {
        let Q = ENDPOINT_CATEGORIES[n],
          startTime = performance.now(),
          q = this.nonOriginRuns.get(Q) ?? {
            sinceMs: startTime,
            refusals: 0,
            windowsSpent: 0,
            othersPassed: !1,
          };
        if (
          (this.nonOriginRuns.set(Q, q),
          q.refusals++,
          (X = startTime - q.sinceMs < nonOrigin403Transient.windowMs),
          X)
        )
          try {
            nonOrigin403Transient.onRefused(Q);
          } catch (error) {
            logForDebugging(`CCRClient: onRefused threw: ${errorMessage(error)}`, { level: "error" });
          }
        else if (startTime - q.sinceMs >= (q.windowsSpent + 1) * nonOrigin403Transient.windowMs)
          (q.windowsSpent++, this.reportNonOriginRun("onWindowSpent", Q));
      }
      if (B.status === 401 || B.status === 403) {
        let Q = getSessionIngressAuthToken(),
          N = Q ? decodeJwtExpiry(Q) : null;
        if (N !== null && N * 1000 < Date.now())
          (logForDebugging(
            `CCRClient: session_token expired (exp=${new Date(N * 1000).toISOString()}) \u2014 no refresh was delivered, exiting`,
            { level: "error" },
          ),
            logForDiagnosticsNoPII("error", "cli_worker_token_expired_no_refresh", void 0, this.lastLineWhen),
            this.onDiagnostic?.(
              `session_token expired (exp=${new Date(N * 1000).toISOString()}) \u2014 no refresh delivered, exiting`,
              "warn",
              "token_expired",
            ),
            this.escalateEpochMismatch("token_expired"));
        if (countTowardEscalation && !X) {
          if ((this.consecutiveAuthFailures++, this.consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES))
            (logForDebugging(
              `CCRClient: ${this.consecutiveAuthFailures} consecutive auth failures with a valid-looking token \u2014 server-side auth unrecoverable, exiting`,
              { level: "error" },
            ),
              logForDiagnosticsNoPII(
                "error",
                "cli_worker_auth_failures_exhausted",
                void 0,
                this.lastLineWhen,
              ),
              this.onDiagnostic?.(
                `${this.consecutiveAuthFailures} consecutive auth failures (HTTP ${B.status}) with valid-looking token \u2014 exiting`,
                "warn",
                "auth_exhausted",
              ),
              this.escalateEpochMismatch("auth_exhausted"));
        }
      }
      if (
        (logForDebugging(`CCRClient: ${r} returned ${B.status}`, { level: "warn" }),
        logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
          method: e,
          path: n,
          status: B.status,
          ...(I !== void 0 && { source: I }),
        }),
        B.status === 429)
      ) {
        let Q = B.headers.get("retry-after"),
          N = Q ? parseInt(Q, 10) : NaN;
        if (!isNaN(N) && N >= 0)
          return { ok: !1, retryAfterMs: N * 1000, status: B.status, reason: `http_${B.status}` };
      }
      return { ok: !1, status: B.status, reason: `http_${B.status}`, ...(X && { nonOriginRefusal: X }) };
    } catch (error) {
      (logForDebugging(`CCRClient: ${r} failed: ${errorMessage(error)}`, { level: "warn" }),
        logForDiagnosticsNoPII("warn", "cli_worker_request_error", {
          method: e,
          path: n,
          error_code: mergeClients(error),
        }));
      let K = `fetch_failed:${mergeClients(error)}`;
      return W ? { ok: !1, reason: K } : { ok: !1, fetchFailed: !0, reason: K };
    } finally {
      P?.cleanup();
    }
  }
  reportNonOriginRun(e, n) {
    let s = this.nonOriginRuns.get(n);
    if (s === void 0 || typeof this.nonOrigin403Transient !== "object") return;
    let rounded = Math.round(performance.now() - s.sinceMs),
      { unsentClientEvents: unsentClientEvents, unsentInternalEvents: unsentInternalEvents } =
        this.uploadBacklog();
    logForDebugging(
      `CCRClient: ${n} ${e === "onCleared" ? "accepted again" : "still refused"} after ${rounded}ms of non-origin 403s (${s.refusals} refusals)`,
      { level: "warn" },
    );
    try {
      this.nonOrigin403Transient[e]({
        lane: n,
        refusals: s.refusals,
        runMs: rounded,
        windowsSpent: s.windowsSpent,
        othersPassed: s.othersPassed,
        backlog: unsentClientEvents + unsentInternalEvents,
      });
    } catch (error) {
      logForDebugging(`CCRClient: ${e} threw: ${errorMessage(error)}`, { level: "error" });
    }
  }
  reportState(e, n) {
    if (e === this.currentState && !n) return;
    let parkReportedAtInitRequestId = this.parkReportedAtInitRequestId;
    if (
      ((this.parkReportedAtInitRequestId = void 0),
      parkReportedAtInitRequestId !== void 0 &&
        e === "requires_action" &&
        this.currentState === "requires_action" &&
        requestIdOf(n) === parkReportedAtInitRequestId)
    )
      return;
    if (e === "idle") (this.openPickupBarriers(this.pickupBarriers.length), this.openTurn());
    ((this.currentState = e),
      (this.startReportsWaitUntilMs = 0),
      this.workerState.enqueue({
        worker_status: e,
        requires_action_details: n ? buildRequiresActionDetails(n) : null,
        internal_metadata: {
          reply_degraded: MKs(),
          ...this.clientRowsOwed.stateReported(e, new Date(), this.clientRowsAreGuarded()),
        },
        ...(this.autocompactStateStored !== void 0 && {
          external_metadata: { autocompact_state: this.autocompactStateStored },
        }),
      }),
      (this.autocompactStateStored = void 0),
      this.applyUploadHold(e === "running" ? "idle" : e));
  }
  reportMetadata(e) {
    let n = this.flushPolicy?.metadataNeverSent,
      withoutRepeatsOfRecord = this.withoutRepeatsOfRecord(
        n?.size && this.followsServedPolicy ? Do(e, (r, h) => r === null || !n.has(h)) : e,
      );
    if (withoutRepeatsOfRecord !== e && Object.keys(withoutRepeatsOfRecord).length === 0) return;
    this.workerState.enqueue({ external_metadata: blockedToNeedInput(withoutRepeatsOfRecord) });
  }
  withoutRepeatsOfRecord(e) {
    let filtered = Object.keys(e).filter((s) => {
      if (!Ns.has(s) || this.reportedKeys.has(s)) return !1;
      return (
        this.reportedKeys.add(s),
        this.recordAtStart !== void 0 && En(e[s] ?? void 0, this.recordAtStart[s] ?? void 0)
      );
    });
    return filtered.length > 0 ? Do(e, (s, r) => !filtered.includes(r)) : e;
  }
  reportInternalMetadata(e) {
    this.workerState.enqueue({ internal_metadata: e });
  }
  handleEpochMismatch(e) {
    let n = e ?? "epoch_conflict",
      s = e ?? "unattributed";
    (logForDebugging(`CCRClient: Epoch mismatch (409, reason=${s}), shutting down`, { level: "error" }),
      logForDiagnosticsNoPII(
        "error",
        n === "epoch_stale"
          ? "cli_worker_epoch_stale"
          : n === "session_not_active"
            ? "cli_worker_session_not_active"
            : "cli_worker_epoch_mismatch",
        { reason: s },
        this.lastLineWhen,
      ));
    let r =
      n === "epoch_stale"
        ? "stale registration (no live successor)"
        : n === "session_not_active"
          ? "session archived or no longer active"
          : n === "superseded_by_worker"
            ? "superseded by a newer worker"
            : "unattributed conflict, treated as superseded";
    (this.onDiagnostic?.(
      `worker epoch mismatch (409) reason=${s} epoch=${this.workerEpoch} \u2014 ${r}, exiting`,
      "warn",
      n,
    ),
      this.escalateEpochMismatch(n));
  }
  escalateEpochMismatch(e) {
    return (
      (this.lastEpochMismatchCause = e),
      this.epochMismatchCount++,
      (this.epochSuperseded = !0),
      this.onEpochMismatch(e)
    );
  }
  startHeartbeat() {
    if ((this.stopHeartbeat(), this.closed)) return;
    let e = () => {
        let s = this.heartbeatIntervalMs * this.heartbeatJitterFraction * (2 * Math.random() - 1);
        this.heartbeatTimer = setTimeout(n, this.heartbeatIntervalMs + s);
      },
      n = () => {
        let lastCadenceTickAtMs = this.lastCadenceTickAtMs;
        if (((this.lastCadenceTickAtMs = Date.now()), this.canSkipCadenceBeat(lastCadenceTickAtMs)))
          ((this.skippedPreviousCadenceBeat = !0),
            this.idleTracker?.sampleIdleSeconds(),
            logForDebugging("CCRClient: Heartbeat skipped (events beat)"));
        else this.sendHeartbeat();
        if (this.heartbeatTimer === null) return;
        if (
          this.holdsAcrossModelCalls() &&
          this.turnHold === "whole" &&
          env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
          hasActiveWork() &&
          this.lastCadenceTickAtMs - this.lastEventsAnswerOrPulseAtMs >= Rt
        )
          ((this.lastEventsAnswerOrPulseAtMs = this.lastCadenceTickAtMs),
            this.writeEvent({ type: "keep_alive" }));
        e();
      };
    ((this.lastCadenceTickAtMs = Date.now()), e());
  }
  noteBeatingEventsPostOk(e) {
    if (
      ((this.lastEventsAnswerOrPulseAtMs = Date.now()),
      !this.workerSocket?.isTransport() && e.some((n) => !n.ephemeral))
    )
      this.lastBeatingEventsPostOkAtMs = Date.now();
  }
  canSkipCadenceBeat(e) {
    let n = this.heartbeatIntervalMs * (1 + this.heartbeatJitterFraction);
    if (
      !this.skipRedundantHeartbeats ||
      this.closed ||
      this.lastBeatingEventsPostOkAtMs < e ||
      this.lastBeatingEventsPostOkAtMs > this.lastCadenceTickAtMs ||
      this.lastCadenceTickAtMs - this.lastBeatingEventsPostOkAtMs > n * HEARTBEAT_STALE_FACTOR ||
      this.heartbeatIntervalMs > this.seedHeartbeatIntervalMs ||
      this.isIdleAdvised() ||
      this.consecutiveHeartbeatFailures > 0 ||
      this.skippedPreviousCadenceBeat
    )
      return !1;
    let s = n * 2;
    return this.clampToTokenLifetime(s) >= s;
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) (clearTimeout(this.heartbeatTimer), (this.heartbeatTimer = null));
  }
  clearProbeBeatTimer() {
    if (this.probeBeatTimer) (clearTimeout(this.probeBeatTimer), (this.probeBeatTimer = null));
  }
  async releaseLease({ drained: drained = !1 } = {}) {
    if (this.workerEpoch <= 0 || this.epochSuperseded) return;
    try {
      let request = await this.request(
        "post",
        "/worker/heartbeat",
        {
          session_id: this.sessionId,
          worker_epoch: this.workerEpoch,
          release_lease: !0,
          ...(drained && { drained: !0 }),
        },
        "POST worker/heartbeat (release)",
        { timeout: SHUTDOWN_REQUEST_TIMEOUT_MS, countTowardEscalation: !1 },
      );
      if (request.ok) logFeatureOk("ccr_worker_lease_release");
      else if (request.status !== 409)
        logFeatureSad(
          "ccr_worker_lease_release",
          request.status !== void 0 ? `http_${request.status}` : "send_failed",
        );
    } catch (error) {
      (logError(error), logFeatureSad("ccr_worker_lease_release", "send_threw"));
    }
  }
  sendGoodbye() {
    if (this.workerEpoch <= 0 || this.epochSuperseded) return;
    if (this.currentState === "running") {
      (logForDiagnosticsNoPII("info", "cli_worker_goodbye_skipped_mid_turn"), (this.leftMidTurn = !0));
      return;
    }
    this.goodbyeFlushed = this.request(
      "put",
      "/worker",
      { worker_epoch: this.workerEpoch, connection_status: "disconnected" },
      "PUT worker (goodbye)",
      { timeout: SHUTDOWN_REQUEST_TIMEOUT_MS, countTowardEscalation: !1 },
    )
      .then((e) => {
        if (e.ok) logFeatureOk("ccr_worker_goodbye");
        else if (e.status !== 409)
          logFeatureSad("ccr_worker_goodbye", e.status !== void 0 ? `http_${e.status}` : "send_failed");
      })
      .catch(() => {
        logFeatureSad("ccr_worker_goodbye", "send_threw");
      });
  }
  heartbeatNow(e = "probe") {
    if (this.closed) return;
    if (
      e === "probe"
        ? this.pendingBeatTrigger === "reactivate"
        : e === "reactivate" && this.pendingBeatTrigger === "probe"
    )
      this.restoreReactivationArm();
    if (
      e === "probe" ||
      this.pendingBeatTrigger === null ||
      (e === "reactivate" && this.pendingBeatTrigger !== "probe")
    )
      this.pendingBeatTrigger = e;
    if (this.heartbeatInFlight) {
      this.pendingForcedBeat = !0;
      return;
    }
    let s = Date.now() - this.lastHeartbeatSentAtMs;
    if (s < this.probeBeatSpacingMs) {
      if (this.probeBeatTimer) return;
      this.probeBeatTimer = setTimeout(() => {
        ((this.probeBeatTimer = null), this.refireForcedBeat());
      }, this.probeBeatSpacingMs - s);
      return;
    }
    let r = this.pendingBeatTrigger ?? e;
    ((this.pendingBeatTrigger = null), this.clearProbeBeatTimer(), this.sendHeartbeat(r));
  }
  refireForcedBeat() {
    let e = this.pendingBeatTrigger ?? "probe";
    if (e === "resync_stale" && !this.staleReconnectBeatWanted()) {
      ((this.pendingBeatTrigger = null), this.clearProbeBeatTimer());
      return;
    }
    if (e === "reactivate") {
      if ((this.restoreReactivationArm(), !this.reactivationBeatWanted())) {
        ((this.pendingBeatTrigger = null), this.clearProbeBeatTimer());
        return;
      }
      this.reactivationBeatArmed = !1;
    }
    this.heartbeatNow(e);
  }
  reactivationBeatWanted() {
    return (
      this.beatOnReactivation &&
      this.reactivationBeatArmed &&
      this.isIdleAdvised() &&
      Date.now() - this.lastHeartbeat429AtMs > this.seedHeartbeatIntervalMs
    );
  }
  restoreReactivationArm() {
    this.reactivationBeatArmed = this.idleGrantLatched;
  }
  armReactivationIfEarned(e, n) {
    if (this.beatOnReactivation && e !== void 0 && e >= n) this.reactivationBeatArmed = !0;
  }
  sendReactivationBeat() {
    if (!this.reactivationBeatWanted()) return;
    ((this.reactivationBeatArmed = !1), this.heartbeatNow("reactivate"));
  }
  isIdleAdvised() {
    return this.advertiseHeartbeatProbeSupport && this.idleGrantLatched;
  }
  applyShorterIntervalNow(e) {
    if (e >= this.heartbeatIntervalMs) return;
    if (((this.heartbeatIntervalMs = e), this.heartbeatTimer !== null)) this.startHeartbeat();
  }
  clampToTokenLifetime(e) {
    if (!this.advertiseHeartbeatProbeSupport || !this.adoptRefreshedAuth) return e;
    let n = getSessionIngressAuthToken(),
      s = n ? decodeJwtExpiry(n) : null;
    if (s === null) return e;
    let r = s * 1000 - Date.now() - TOKEN_REFRESH_LEAD_MS;
    if (r >= e) return e;
    return Math.max(MIN_HEARTBEAT_INTERVAL_MS, r);
  }
  reclampCurrentIntervalToTokenLifetime() {
    let clampToTokenLifetime = this.clampToTokenLifetime(this.heartbeatIntervalMs);
    if (clampToTokenLifetime < this.heartbeatIntervalMs)
      (logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
        from_ms: this.heartbeatIntervalMs,
        to_ms: clampToTokenLifetime,
      }),
        this.applyShorterIntervalNow(clampToTokenLifetime));
  }
  renewStream() {
    let e = () => this.readTransport.renewConnection();
    if (this.workerSocket) this.workerSocket.whenQuiet(e);
    else e();
  }
  resyncAfterReconnect() {
    if (this.isIdleAdvised()) {
      this.heartbeatNow("resync");
      return;
    }
    if (this.staleReconnectBeatWanted()) this.heartbeatNow("resync_stale");
  }
  staleReconnectBeatWanted() {
    if (!this.beatOnStaleReconnect || this.heartbeatIntervalMs <= this.seedHeartbeatIntervalMs) return !1;
    let now = Date.now();
    if (now - this.lastHeartbeatSuccessAtMs <= this.heartbeatIntervalMs * HEARTBEAT_STALE_FACTOR) return !1;
    return now - this.lastHeartbeat429AtMs > this.heartbeatIntervalMs;
  }
  resetHeartbeatStreak() {
    ((this.consecutiveHeartbeatFailures = 0), (this.heartbeatLostFiredForStreak = !1));
  }
  async sendHeartbeat(e) {
    if (this.closed) {
      this.stopHeartbeat();
      return;
    }
    if (
      (this.workerState.sendWaiting(this.followsServedPolicy ? this.flushPolicy?.metadataMaxWaitMs : 0),
      this.heartbeatInFlight)
    )
      return;
    ((this.heartbeatInFlight = !0), (this.lastHeartbeatSentAtMs = Date.now()));
    let lastHeartbeatSentAtMs = this.lastHeartbeatSentAtMs,
      s = ++this.heartbeatsSent,
      r = { succeededLateOnSocket: !1 };
    if (((this.skippedPreviousCadenceBeat = !1), e === "resync_stale"))
      logForDiagnosticsNoPII("info", "cli_heartbeat_reconnect_stale_beat", {
        gap_ms: this.lastHeartbeatSentAtMs - this.lastHeartbeatSuccessAtMs,
        interval_ms: this.heartbeatIntervalMs,
      });
    try {
      if (e === "reactivate")
        logForDiagnosticsNoPII("info", "cli_heartbeat_reactivation_beat", {
          interval_ms: this.heartbeatIntervalMs,
        });
      let h = this.idleTracker?.sampleIdleSeconds(),
        w = this.advertiseHeartbeatProbeSupport ? h : void 0,
        request = await this.request(
          "post",
          "/worker/heartbeat",
          {
            session_id: this.sessionId,
            worker_epoch: this.workerEpoch,
            ...(this.advertiseHeartbeatProbeSupport && {
              supports_heartbeat_probe: !0,
              current_interval_seconds: Math.round(this.heartbeatIntervalMs / 1000),
              ...(w !== void 0 && { idle_seconds: w }),
            }),
          },
          "Heartbeat",
          {
            timeout: Math.max(
              UNUSED_TIMEOUT_5000_MS,
              Math.min(
                MAX_HEARTBEAT_LEAD_MS,
                this.heartbeatIntervalMs * (1 - this.heartbeatJitterFraction) - HEARTBEAT_SAFETY_MARGIN_MS,
              ),
            ),
            parseBody: !0,
            countTowardEscalation: e === void 0,
            onLateSocketAnswer: (y) => {
              ((r.succeededLateOnSocket = !0), this.takeUpLateBeat(y, lastHeartbeatSentAtMs, s, w));
            },
          },
        );
      if (!request.ok && request.reason === "closed") return;
      if (
        ((this.lastSettledBeat = Math.max(this.lastSettledBeat, s)), !request.ok && r.succeededLateOnSocket)
      ) {
        if (request.status === 429) this.lastHeartbeat429AtMs = Date.now();
        logForDebugging(
          "CCRClient: Heartbeat succeeded late on the worker socket; its POST failed, which is not counted as a missed heartbeat",
        );
      }
      if (!request.ok && !r.succeededLateOnSocket) {
        if (e === "probe") logFeatureBad("ccr_heartbeat_probe", "beat_failed");
        else if (e === "resync_stale") logFeatureBad("ccr_reconnect_beat", "beat_failed");
        else if (e === "reactivate") logFeatureBad("ccr_reactivation_beat", "beat_failed");
        if (request.status === 429) {
          if (((this.lastHeartbeat429AtMs = Date.now()), e === "reactivate")) this.restoreReactivationArm();
        }
        if (this.isIdleAdvised() && request.status !== 429)
          (logForDiagnosticsNoPII("warn", "cli_heartbeat_idle_reverted_on_failure", {
            status: request.status,
          }),
            (this.idleGrantLatched = !1),
            (this.reactivationBeatArmed = !1),
            this.applyShorterIntervalNow(this.seedHeartbeatIntervalMs));
        if (
          (this.reclampCurrentIntervalToTokenLifetime(),
          request.status !== void 0 &&
            HEARTBEAT_FATAL_STATUSES.has(request.status) &&
            !request.nonOriginRefusal)
        ) {
          this.resetHeartbeatStreak();
          return;
        }
        if (!this.readTransport.isReadStreamRecentlyAlive()) {
          this.resetHeartbeatStreak();
          return;
        }
        if (this.consecutiveHeartbeatFailures === 0) this.heartbeatStreakStartedAtMs = Date.now();
        if (
          (this.consecutiveHeartbeatFailures++,
          !this.heartbeatLostFiredForStreak &&
            this.consecutiveHeartbeatFailures >= MAX_CONSECUTIVE_HEARTBEAT_FAILURES &&
            Date.now() - this.heartbeatStreakStartedAtMs >=
              this.readTransport.getReadStreamRecentLivenessWindowMs())
        ) {
          this.heartbeatLostFiredForStreak = !0;
          try {
            this.onHeartbeatLost?.();
          } catch (error) {
            logError(error);
          }
        }
        return;
      }
      if (e === "probe") logFeatureOk("ccr_heartbeat_probe");
      else if (e === "resync_stale") logFeatureOk("ccr_reconnect_beat");
      else if (e === "reactivate") logFeatureOk("ccr_reactivation_beat");
      if (request.ok)
        (logForDebugging("CCRClient: Heartbeat sent"),
          await this.takeUpBeatAnswer(request.data, lastHeartbeatSentAtMs, s, w));
    } finally {
      if (((this.heartbeatInFlight = !1), this.pendingForcedBeat && !this.closed))
        ((this.pendingForcedBeat = !1), this.refireForcedBeat());
    }
  }
  async takeUpBeatAnswer(e, n, s, r) {
    let h = () => this.lastSucceededBeat > s;
    if (this.lastSettledBeat <= s) this.resetHeartbeatStreak();
    if (!h()) ((this.lastSucceededBeat = s), (this.lastHeartbeatSuccessAtMs = n));
    if ((this.onRequestAuthOk?.(), !h() && isPlainObject(e))) this.takeUpFlushPolicy(e.event_flush_policy);
    if (e?.refreshed_auth && this.adoptRefreshedAuth) {
      let y = !1;
      try {
        let O = !1,
          adoptRefreshedAuth = this.adoptRefreshedAuth(e.refreshed_auth.expires_in_seconds);
        adoptRefreshedAuth.then(
          (P) => {
            if (O && P.adopted)
              ((this.lastAuthRefreshBadReason = null),
                logFeatureOk("ccr_worker_auth_refresh"),
                logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_late_adopted"),
                this.renewSocketForNewToken());
          },
          () => {},
        );
        let U = await withDeadline(
            adoptRefreshedAuth,
            Math.min(AUTH_REFRESH_TIMEOUT_MS, this.heartbeatIntervalMs),
          ),
          S;
        if (U === void 0) ((O = !0), (S = { adopted: !1, reason: "adopt_timeout" }));
        else S = U;
        if (
          (logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_signal", {
            adopted: S.adopted,
            reason: S.reason,
            expires_in_seconds: e.refreshed_auth.expires_in_seconds,
          }),
          S.adopted)
        )
          (logFeatureOk("ccr_worker_auth_refresh"), (this.lastAuthRefreshBadReason = null), (y = !0));
        else if (S.reason && S.reason !== "unchanged" && S.reason !== this.lastAuthRefreshBadReason)
          ((this.lastAuthRefreshBadReason = S.reason), logFeatureBad("ccr_worker_auth_refresh", S.reason));
      } catch {
        if (this.lastAuthRefreshBadReason !== "adopt_threw")
          ((this.lastAuthRefreshBadReason = "adopt_threw"),
            logFeatureBad("ccr_worker_auth_refresh", "adopt_threw"));
        logForDiagnosticsNoPII("error", "cli_heartbeat_refreshed_auth_adopt_threw");
      }
      if (y) this.renewSocketForNewToken();
    }
    if (h()) return;
    let w = e?.heartbeat_interval_seconds;
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) {
      if (this.idleGrantLatched) this.armReactivationIfEarned(r, this.heartbeatIntervalMs / 1000);
      this.reclampCurrentIntervalToTokenLifetime();
      return;
    }
    if (this.advertiseHeartbeatProbeSupport) {
      let y = w * 1000 > this.seedHeartbeatIntervalMs;
      if (y) this.armReactivationIfEarned(r, w);
      else this.reactivationBeatArmed = !1;
      this.idleGrantLatched = y;
    }
    let clampToTokenLifetime = this.clampToTokenLifetime(
      Math.min(Math.max(w * 1000, MIN_HEARTBEAT_INTERVAL_MS), this.maxAdvisedIntervalMs),
    );
    if (clampToTokenLifetime === this.heartbeatIntervalMs) return;
    if (
      (logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
        from_ms: this.heartbeatIntervalMs,
        to_ms: clampToTokenLifetime,
      }),
      clampToTokenLifetime < this.heartbeatIntervalMs)
    )
      this.applyShorterIntervalNow(clampToTokenLifetime);
    else this.heartbeatIntervalMs = clampToTokenLifetime;
  }
  async takeUpLateBeat(e, n, s, r) {
    try {
      if (this.closed || !e.ok) return;
      let body = await e.json();
      if (this.closed) return;
      (logForDebugging("CCRClient: Heartbeat answered late on the worker socket"),
        (this.consecutiveAuthFailures = 0),
        (this.consecutiveNotFound = 0),
        await this.takeUpBeatAnswer(body, n, s, r));
    } catch (error) {
      logForDebugging(
        `CCRClient: could not act on a heartbeat answer that arrived late on the worker socket: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
  }
  renewSocketForNewToken() {
    if (!this.workerSocket?.isTransport()) return;
    try {
      this.workerSocket.whenQuiet(() => this.readTransport.renewConnection(), !0);
    } catch (error) {
      logForDebugging(
        `CCRClient: could not renew the worker socket for a new token: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
  }
  reportDurableUpload(e, n) {
    let resultThatMarks = this.resultThatMarks;
    if (
      n === "accepted" &&
      resultThatMarks &&
      resultThatMarks.marked !== this.sessionModelTurnStored &&
      e.some((h) => h.payload.uuid === resultThatMarks.uuid)
    )
      ((this.sessionModelTurnStored = resultThatMarks.marked),
        this.reportInternalMetadata({ model_turn_stored: resultThatMarks.marked }));
    if (n === "accepted")
      this.autocompactStateStored =
        e.findLast((h) => !h.ephemeral && h.payload.type === "autocompact_state")?.payload.value ??
        this.autocompactStateStored;
    if (this.onDurableEventsUpload === void 0) return;
    let filtered = e.filter((h) => !h.ephemeral);
    if (filtered.length === 0) return;
    try {
      this.onDurableEventsUpload(filtered, n);
    } catch (error) {
      logForDebugging(
        `CCRClient: onDurableEventsUpload(${n}) threw; the batch's fate is unchanged: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
  }
  writeEvent(e) {
    return this.writeEvents([e]);
  }
  trackFirstFrameUpload(e) {
    let n = {};
    return ((this.firstFrameUpload = { uuid: e, timing: n }), n);
  }
  trackFirstTextFrameUpload(e) {
    let n = {};
    return ((this.firstTextFrameUpload = { uuid: e, timing: n }), n);
  }
  trackFirstBlockFrameUpload(e) {
    let n = {};
    return ((this.firstBlockFrameUpload = { uuid: e, timing: n }), n);
  }
  trackedFrameUploads(e) {
    let n = [];
    for (let s of [this.firstFrameUpload, this.firstTextFrameUpload, this.firstBlockFrameUpload])
      if (s && s.timing[e] === void 0) n.push(s);
    return n;
  }
  writeEvents(e, n) {
    let flattened = e.flatMap((S) => {
        if (
          S.type !== "system" ||
          (S.subtype !== "task_started" && S.subtype !== "task_updated" && S.subtype !== "task_notification")
        )
          return [S];
        let P =
          S.subtype !== "task_started"
            ? this.liveOnlyShellStarts.get(S.task_id)
            : classifyRowTypeForTelemetry(S) === "system/task_started_foreground_shell" &&
                this.shellTaskRowsLiveOnly()
              ? S
              : void 0;
        if ((this.liveOnlyShellStarts.delete(S.task_id), !P)) return [S];
        if (
          (S.subtype === "task_updated" && S.patch.is_backgrounded) ||
          Buffer.byteLength(jsonStringify(S)) > Ne
        )
          return P === S ? [S] : [{ ...P }, S];
        if (S.subtype !== "task_notification") this.liveOnlyShellStarts.set(S.task_id, P);
        return (this.rowsMarkedLiveOnly.add(S), [S]);
      }),
      artifactSocketIds = this.artifactSocketIds,
      filtered = (
        !artifactSocketIds
          ? flattened
          : flattened.flatMap((S) => {
              if (S.type !== "system") return [S];
              switch (S.subtype) {
                case "background_tasks_changed": {
                  artifactSocketIds.clear();
                  let filtered = S.tasks.filter((task) => {
                      if (task.task_type !== "monitor_ws" || task.ambient !== !0) return !0;
                      return (artifactSocketIds.add(task.task_id), !1);
                    }),
                    W = { whole: jsonStringify(S.tasks), withoutSockets: jsonStringify(filtered) },
                    x =
                      this.lastTaskList !== void 0 &&
                      W.whole !== this.lastTaskList.whole &&
                      W.withoutSockets === this.lastTaskList.withoutSockets;
                  return ((this.lastTaskList = W), x ? [] : [{ ...S, tasks: filtered }]);
                }
                case "task_started":
                  if (S.task_type !== "monitor_ws" || S.ambient !== !0) return [S];
                  return (artifactSocketIds.add(S.task_id), []);
                case "task_updated":
                  return artifactSocketIds.has(S.task_id) ? [] : [S];
                case "task_notification":
                  return S.ambient === !0 && S.task_id.startsWith("s") ? [] : [S];
                default:
                  return [S];
              }
            })
      ).filter((S) => {
        if (
          S.type === "system" &&
          S.subtype === "task_progress" &&
          S.summary === void 0 &&
          S.workflow_progress === void 0
        )
          return !1;
        if (S.type === "active_goal" || S.type === "autocompact_state") {
          let x = !this.stateRowTypesWritten.has(S.type);
          this.stateRowTypesWritten.add(S.type);
          let z = this.recordAtStart?.goal;
          return !(
            x &&
            (S.type === "autocompact_state"
              ? En(S.value, this.recordAtStart?.autocompact_state)
              : S.value === null && this.recordAtStart !== void 0 && (!isPlainObject(z) || z.met === !0))
          );
        }
        if (S.type !== "rate_limit_event") return !0;
        let P = classifyRowTypeForTelemetry(S),
          W =
            P === "rate_limit_event/allowed" &&
            P === this.lastRateLimitKind &&
            S.rate_limit_info.overagePeriodMonthly === void 0 &&
            S.rate_limit_info.overagePeriodChannel === void 0;
        return ((this.lastRateLimitKind = P), !W || this.currentUploadTrim().rate_limit_repeats !== !0);
      });
    if (e.length > 0 && filtered.length === 0) return Promise.resolve();
    this.reportClientRowsOwed(
      this.clientRowsAreGuarded()
        ? this.clientRowsOwed.rowsEntered(filtered, new Date())
        : this.clientRowsOwed.guardEnded(new Date()),
    );
    let v = this.flushPolicy?.settingsAnswersMaxWaitMs ?? 0,
      y = this.flushPolicy?.initMaxWaitMs ?? 0;
    if (
      (v > 0 || y > 0) &&
      filtered.length > 0 &&
      this.followsServedPolicy &&
      !this.closed &&
      this.pickupBarriers.length === 0
    ) {
      let mapped = filtered.map((P) =>
        this.isSettingsAnswer(P)
          ? v
          : isTopLevelSystemInit(P) ||
              (P.type === "user" && "isReplay" in P && P.isReplay && this.turnHold === "open")
            ? y
            : 0,
      );
      if (mapped.every((P) => P > 0))
        return (
          this.waitingAnswers.push(...filtered),
          (this.waitingAnswersTimer ??= setTimeout(() => this.sendWaitingAnswers(), Math.min(...mapped))),
          Promise.resolve()
        );
    }
    let O =
        this.waitingAnswers.length > 0 &&
        (filtered.length === 0 || filtered.some((S) => S.type !== "stream_event"))
          ? [...this.takeWaitingAnswers(), ...filtered]
          : filtered,
      at = this.pickupBarriers.at(-1);
    if (!at) return this.writeEventsNow(O, n);
    let withResolvers = Promise.withResolvers();
    if (
      (at.writes.push({ messages: O, opts: n, written: withResolvers }),
      this.pickupBarriers.reduce((S, P) => S + P.writes.length, 0) >= ks)
    )
      this.openPickupBarriers(this.pickupBarriers.length);
    return withResolvers.promise;
  }
  noteSettingsRequest(e) {
    if (
      !isPlainObject(e) ||
      e.type !== "control_request" ||
      typeof e.request_id !== "string" ||
      !isRelayableControlFrame(e)
    )
      return;
    this.settingsRequestIds.add(e.request_id);
    let n = this.settingsRequestIds.values().next().value;
    if (this.settingsRequestIds.size > MAX_SETTINGS_REQUEST_IDS && n !== void 0)
      this.settingsRequestIds.delete(n);
  }
  isSettingsAnswer(e) {
    return (
      e.type === "control_response" &&
      e.response.subtype === "success" &&
      this.settingsRequestIds.has(e.response.request_id)
    );
  }
  sendWaitingAnswers() {
    if (this.waitingAnswers.length > 0) this.writeEvents([]);
  }
  takeWaitingAnswers() {
    if (this.waitingAnswersTimer) (clearTimeout(this.waitingAnswersTimer), (this.waitingAnswersTimer = null));
    return this.waitingAnswers.splice(0);
  }
  async writeEventsNow(e, n) {
    let s = [],
      r = [],
      h,
      w,
      v = !1,
      y,
      O,
      C = !1,
      U = [],
      S = [],
      P = [],
      W = [],
      x;
    for (let Y of e) {
      let R = Y.type === "stream_event" ? stripInputTransformations(Y) : Y;
      if (R.type === "stream_event" && R.event.type === "message_start" && !R.parent_tool_use_id) {
        if (
          ((this.modelCallStreamed = !0),
          (this.streamedResponseId = R.event.message.id),
          this.liveTwinTypes()?.size)
        )
          ((R = { ...R }),
            W.push({ frame: R, at: s.length, turnId: this.liveTurnId, index: this.nextLiveIndex }));
      }
      if ((R.type === "assistant" || R.type === "user") && R.parent_tool_use_id)
        this.subAgentWroteSinceStoredRequesting = !0;
      let noteRequestingRow = this.noteRequestingRow(R);
      if (noteRequestingRow) {
        let toClientEvent = this.toClientEvent(noteRequestingRow);
        s.push(
          noteRequestingRow === this.liveOnlyStartingRow ? this.withStamp(toClientEvent) : toClientEvent,
        );
      }
      let L = w ? void 0 : this.holdAgainAt(R),
        I = this.turnHold === "open",
        releaseFor = this.releaseFor(R, L);
      if (releaseFor === "event" && !w) y = classifyRowTypeForTelemetry(R);
      if (((w ??= releaseFor), I && releaseFor === "round_trip" && this.flushPolicy?.holdAcrossModelCalls))
        ((w = releaseFor), (y = void 0));
      if (
        (I && releaseFor === "round_trip") ||
        R.type === "result" ||
        R.type.startsWith("control_") ||
        (R.type === "system" && "subtype" in R && (R.subtype === "init" || R.subtype === "task_notification"))
      )
        O ??= classifyRowTypeForTelemetry(R);
      if (
        ((this.streamEventFirstFlushMs > 0 && !releaseFor) ||
          this.noSubscriberStreamEventFlushIntervalMs > 0 ||
          this.dropUnwatchedStreamEvents ||
          (this.unwatched() && this.currentState === "running")) &&
        this.streamEventFlushIntervalMs > 0 &&
        Ut(R)
      ) {
        this.bufferEphemeral(R);
        continue;
      }
      if (R.type === "stream_event") {
        if (
          ((this.streamedEphemeralSinceLastAssistant = !0),
          R.event.type === "message_stop" &&
            this.holdRule === "served_policy" &&
            this.flushPolicy?.flushOnSamplingEnd)
        ) {
          (this.bufferEphemeral(R), (h ??= this.streamEventBufferedAt), (v = !0));
          let takeStreamEventBuffer = this.takeStreamEventBuffer();
          ((w ??= takeStreamEventBuffer.release), s.push(...takeStreamEventBuffer.events));
          continue;
        }
        if (this.streamEventFlushIntervalMs <= 0) {
          let byteLength = Buffer.byteLength(jsonStringify(R));
          if (byteLength <= Oun) s.push({ payload: R, ephemeral: !0 });
          else dropOversizeStreamEvent(R, byteLength);
          continue;
        }
        if ((this.bufferEphemeral(R), R.event.type === "content_block_start" && this.parkedRows.length > 0)) {
          h ??= this.streamEventBufferedAt;
          let takeStreamEventBuffer = this.takeStreamEventBuffer();
          ((w ??= takeStreamEventBuffer.release), s.push(...takeStreamEventBuffer.events));
        }
        continue;
      }
      let X = R.type === "control_request" ? this.toClientEvent(R) : void 0;
      if (
        R.type === "control_request" &&
        X !== void 0 &&
        SERVED_CALL_REQUEST_SUBTYPES.has(getControlRequestSubtypeOfEvent(X)) &&
        this.servedCallRequestsJumpQueue()
      ) {
        if (!this.holdsAcrossModelCalls() && this.clientRowsOwed.rowsSentAgain.size === 0) {
          (r.push(X), this.urgentRequestIds.add(R.request_id));
          let j = this.urgentRequestIds.values().next().value;
          if (this.urgentRequestIds.size > MAX_URGENT_REQUEST_IDS && j !== void 0)
            this.urgentRequestIds.delete(j);
          continue;
        }
        C = !0;
      }
      if (R.type === "control_cancel_request" && this.urgentRequestIds.delete(R.request_id)) {
        r.push(this.toClientEvent(R));
        continue;
      }
      if (R.type === "control_cancel_request" && this.holdsAcrossModelCalls()) C = !0;
      if (R.type === "assistant" && this.streamedEphemeralSinceLastAssistant)
        (logFeatureOk("ccr_partial_messages", {
          stream_events_dropped_unwatched: this.streamEventsDroppedUnwatched,
        }),
          (this.streamedEphemeralSinceLastAssistant = !1),
          (this.streamEventsDroppedUnwatched = 0));
      if (releaseFor === void 0 && this.mayParkTextRow(R)) {
        this.parkedRows.push({ message: R, event: this.toClientEvent(R) });
        continue;
      }
      if (this.streamEventTimer) {
        h ??= this.streamEventBufferedAt;
        let takeStreamEventBuffer = this.takeStreamEventBuffer();
        ((w ??= takeStreamEventBuffer.release), s.push(...takeStreamEventBuffer.events));
      }
      if (this.gatesToolCalls) {
        let j = getMainThreadToolUseIds(R);
        if (j.some((Z) => this.awaitedToolCalls.has(Z))) w ??= "tool_call";
        U.push(...j);
      }
      let Q = this.flushPolicy?.flushAfterToolNames;
      if (Q && Q.size > 0)
        for (let j of getMainThreadToolUseIds(R, Q))
          (this.toolCallsWhoseResultReleases.add(j), ce(this.toolCallsWhoseResultReleases));
      if (this.flushPolicy?.transcriptMaxAgeMs)
        for (let j of getMainThreadToolUseIds(R, lr))
          (this.toolCallsWhoseResultReleases.add(j), ce(this.toolCallsWhoseResultReleases));
      let N = this.flushPolicy?.holdAgain;
      if (N && R.type === "assistant" && !R.parent_tool_use_id) {
        if (R.message.id !== this.newestResponseId)
          ((this.newestResponseId = R.message.id), this.unansweredCalls.clear());
        for (let j of getMainThreadToolUseIds(R)) this.unansweredCalls.add(j);
        if (getMainThreadToolUseIds(R, N.neverAfterTools).length > 0) this.holdsNoMoreThisTurn = !0;
        if (N.toolsWhoseResultsWait)
          for (let j of getMainThreadToolUseIds(R, N.toolsWhoseResultsWait))
            (this.callsWhoseResultsWait.add(j), ce(this.callsWhoseResultsWait));
      }
      if (N && R.type === "user") {
        for (let j of collectContentBlockField(R.message, "tool_result", "tool_use_id"))
          this.unansweredCalls.delete(j);
        if (
          N.toolsWhoseResultsWait &&
          !R.parent_tool_use_id &&
          Array.isArray(R.message.content) &&
          R.message.content.some(
            (j) =>
              j.type === "tool_result" &&
              (j.is_error === !0 || !this.callsWhoseResultsWait.has(j.tool_use_id)),
          )
        )
          this.heldResultNeedsStore = !0;
      }
      if (this.isLiveTwinRow(R)) S.push(s.length);
      if (
        R === this.liveOnlyRequestingRow &&
        this.holdsAcrossModelCalls() &&
        !(
          releaseFor === "round_trip" &&
          !I &&
          !this.subAgentWroteSinceStoredRequesting &&
          this.flushPolicy?.liveOnlyTypes.has(Jt) &&
          (L !== "starts" ||
            (this.nextLiveIndex === this.indexBehindHeldToolResult &&
              this.flushPolicy.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_STARTING)))
        )
      )
        ((this.liveOnlyRequestingRow = void 0), (x = s.length));
      if (
        releaseFor === "round_trip" &&
        R !== this.liveOnlyRequestingRow &&
        !("parent_tool_use_id" in R && R.parent_tool_use_id)
      )
        this.subAgentWroteSinceStoredRequesting = !1;
      if (
        R.type === "system" &&
        R.subtype === "task_started" &&
        classifyRowTypeForTelemetry(R) === "system/task_started_foreground_shell" &&
        !this.isLiveOnlyRow(R)
      )
        P.push([s.length, R.task_id]);
      let q = X ?? this.toClientEvent(R);
      if (L === "starts")
        if (R === this.liveOnlyRequestingRow) this.liveOnlyStartingRow = R;
        else q = this.withStamp(q);
      if (R.type === "system" && "subtype" in R && R.subtype === "init" && !q.payload.parent_tool_use_id)
        ((this.liveTurnId = q.payload.uuid),
          (this.nextLiveIndex = 0),
          this.openTurn(),
          (this.droppedBeforeLiveTurn = this.droppedDurableBatches));
      if (!q.ephemeral) this.indexBehindHeldToolResult = void 0;
      s.push(q);
    }
    let z = [],
      heldRepeatUuid = this.heldRepeatUuid;
    if (!w && !v) {
      let filtered = S.filter((R) => {
        let B = s[R];
        return B && !B.historical && this.eventUploader.holdsOnArrival(B);
      });
      if (
        !this.viewerAbsentReported &&
        filtered.some(
          (R) =>
            Buffer.byteLength(jsonStringify(s[R]?.payload)) > Ne ||
            estimateJsonEncodedSize(s[R]?.payload) > Ds,
        )
      )
        w = "twin_too_large";
      else {
        for (let [B, L] of P) {
          let I = s[B];
          if (I && this.eventUploader.holdsOnArrival(I)) this.heldShellTaskIds.add(L);
        }
        z = filtered;
        for (let B of filtered) {
          let L = s[B];
          if (L) {
            if (B === x) this.heldRepeatUuid = L.payload.uuid;
            s[B] = this.withStamp(L);
          }
        }
        let R = filtered.length > 0 ? s.findLast((B) => !B.ephemeral) : void 0;
        if (R?.payload.live_index !== void 0 && hasToolResultContent(R.payload.message))
          this.indexBehindHeldToolResult = this.nextLiveIndex;
        if (!this.viewerAbsentReported)
          for (let B of filtered.toReversed()) {
            let L = s[B];
            if (L) s.splice(B, 0, { payload: L.payload, ephemeral: !0 });
          }
      }
    }
    if (heldRepeatUuid !== void 0 && this.toolResultEndsCall && z.length > 0)
      ((this.heldRepeatUuid = void 0),
        this.eventUploader.withdraw((Y) => !Y.ephemeral && Y.payload.uuid === heldRepeatUuid));
    for (let { frame: frame, at: at, turnId: turnId, index: index } of W)
      ((frame.live_turn_id = turnId), (frame.live_next_index = index + count(z, (I) => I < at)));
    if (r.length > 0) this.enqueueClientEvents(r, { urgent: !0 });
    if (s.length > 0) {
      if (w) {
        if (w !== "round_trip" && S.some((R) => ["assistant", "user"].includes(s[R]?.payload.type ?? "")))
          this.endWholeTurnHold(w);
        (this.releaseTranscriptLane(w, y, O), (this.heldResultNeedsStore = !1));
      } else if (v) w = "sampling_end";
      let enqueueClientEvents = this.enqueueClientEvents(s, {
        ...(w ? { release: w, releasedBy: y } : { since: h }),
        ...(n?.together && { together: !0 }),
      });
      if (this.flushPolicy?.noTurnMaxAgeMs) this.applyUploadHold("reset");
      if (C) this.eventUploader.cutBackoff();
      (await enqueueClientEvents, this.noteToolCallRows("client_events", U, "queued"));
    } else if (r.length > 0 && w) {
      if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
      (this.releaseTranscriptLane(w, void 0, O), this.releaseClientEvents(w));
    } else if (v) this.releaseClientEvents("sampling_end");
  }
  releaseTranscriptLane(e, n, s) {
    if (this.holdRule !== "served_policy" || !this.flushPolicy?.transcriptMaxAgeMs)
      this.internalEventUploader.release(e, n);
    else if (s !== void 0) this.internalEventUploader.release("event", s);
  }
  releaseFor(e, n) {
    if (e.type === "result") {
      let s = this.turnHold !== "open";
      if (
        ((this.modelTurnEnded ||= s),
        this.flushPolicy?.holdAgain?.laterWorkerHoldsFirstTurn && (s || e.is_error))
      )
        this.resultThatMarks = { uuid: e.uuid, marked: s };
      this.openTurn();
    }
    if (
      e.type === "system" &&
      "subtype" in e &&
      e.subtype === "status" &&
      "status" in e &&
      e.status === "requesting"
    ) {
      if (!this.seesModelCallBoundaries) ((this.seesModelCallBoundaries = !0), this.applyUploadHold("reset"));
      if (this.holdRule === "served_policy") {
        let s = this.turnHold === "whole" && !n && this.requestingRowMayWait(e);
        if (
          this.turnHold === "open" &&
          this.flushPolicy?.firstTurnHoldsEachCall &&
          !this.modelTurnEnded &&
          !(this.flushPolicy.holdAgain?.laterWorkerHoldsFirstTurn && this.sessionModelTurnStored)
        )
          ((this.turnHold = "each_call"), (this.holdsNoMoreThisTurn = !0));
        else if (this.turnHold === "open" || n === "starts") {
          if (
            ((this.secondCallStartsHold = this.turnHold === "open" && !this.modelTurnEnded),
            (this.turnHold = "whole"),
            this.holdsAcrossModelCalls())
          )
            this.uploadHoldTally.wholeTurnHoldStarted();
        } else if (n === "ends")
          ((this.turnHold = "each_call"), this.uploadHoldTally.wholeTurnHoldEndedEarly());
        return s ? void 0 : "round_trip";
      }
    }
    if (e.type === "user" && this.toolResultReleases(e.message)) return "tool_result";
    if (e.type === "assistant" && e.message.id !== this.streamedResponseId && this.isLiveTwinRow(e))
      return "event";
    if (this.holdRule === void 0 || this.mayWaitUnderHold(e)) return;
    return "event";
  }
  requestingRowMayWait(e) {
    return (
      this.holdsAcrossModelCalls() && hasUserMessageUuids(e) && !this.flushPolicy?.mustFlushTypes.has(e.type)
    );
  }
  holdAgainAt(e) {
    let n = this.flushPolicy?.holdAgain;
    if (
      !n ||
      e.type !== "system" ||
      !("subtype" in e) ||
      e.subtype !== "status" ||
      !("status" in e) ||
      e.status !== "requesting" ||
      !this.holdsAcrossModelCalls() ||
      !this.isLiveTwinRow(e)
    )
      return;
    if (this.holdsNoMoreThisTurn || this.droppedDurableBatches !== this.droppedBeforeLiveTurn) return "ends";
    let requestingRowMayWait = this.requestingRowMayWait(e);
    if (this.unansweredCalls.size > 0) return requestingRowMayWait ? void 0 : "ends";
    let held = this.eventUploader.held();
    return this.turnHold === "each_call" ||
      !requestingRowMayWait ||
      this.heldResultNeedsStore ||
      (n.laterWorkerHoldsFirstTurn && this.secondCallStartsHold) ||
      (n.softAgeMs > 0 && held.ageMs >= n.softAgeMs) ||
      (n.softEvents > 0 && held.count >= n.softEvents)
      ? "starts"
      : void 0;
  }
  toolResultReleases(e) {
    if (this.holdRule !== "served_policy") return !1;
    let n = this.flushPolicy?.flushAfterTools === "all";
    return collectContentBlockField(e, "tool_result", "tool_use_id").some(
      (s) => n || this.toolCallsWhoseResultReleases.has(s),
    );
  }
  gateToolCall(e) {
    let flushPolicy = this.flushPolicy;
    if (
      !flushPolicy ||
      (flushPolicy.flushAfterTools !== "write" && flushPolicy.flushBeforeToolsWaitMs <= 0) ||
      e.agentId !== void 0 ||
      this.closed ||
      !this.followsServedPolicy ||
      !e.mayWrite()
    )
      return;
    if (flushPolicy.flushAfterTools === "write")
      (this.toolCallsWhoseResultReleases.add(e.toolUseId), ce(this.toolCallsWhoseResultReleases));
    let s = this.transcriptLaneInUse ? ["client_events", "internal_events"] : ["client_events"];
    if (
      flushPolicy.flushBeforeToolsWaitMs <= 0 ||
      this.lanesNotAnswering.size > 0 ||
      e.signal.aborted ||
      s.every((r) => this.toolCallRows[r].get(e.toolUseId) === "stored")
    )
      return;
    return this.awaitToolCallStored(e, s, flushPolicy.flushBeforeToolsWaitMs);
  }
  async awaitToolCallStored(e, n, s) {
    let toolUseId = e.toolUseId,
      now = Date.now(),
      w = createCombinedAbortSignal(e.signal, { timeoutMs: s, refTimer: !0 });
    this.awaitedToolCalls.add(toolUseId);
    let at = this.pickupBarriers.at(-1);
    if (at && !this.toolCallRows.client_events.has(toolUseId))
      (this.internalEventUploader.release("tool_call"),
        await Promise.race([at.opened.promise, createChildAbortController(w.signal)]));
    let y = createCombinedAbortSignal(w.signal, { timeoutMs: this.toolCallRowGraceMs, refTimer: !0 }),
      O = !1,
      C = !1;
    try {
      if (
        (this.releaseClientEvents("tool_call"),
        this.internalEventUploader.release("tool_call"),
        await Promise.race([
          this.toolCallRowReaches("client_events", toolUseId, "queued"),
          createChildAbortController(y.signal),
        ]),
        (O = this.toolCallRows.client_events.has(toolUseId)),
        (C = y.signal.aborted && !w.signal.aborted),
        O && !this.closed)
      )
        await Promise.race([
          Promise.all(n.map((P) => this.toolCallRowReaches(P, toolUseId, "settled"))),
          createChildAbortController(w.signal),
        ]);
    } finally {
      (y.cleanup(), w.cleanup(), this.awaitedToolCalls.delete(toolUseId));
      for (let P of n) this.toolCallRowWaiters.delete(`${P} ${toolUseId}`);
    }
    let S = n.every((P) => this.toolCallRows[P].get(toolUseId) === "stored")
      ? "stored"
      : this.closed
        ? "closed"
        : e.signal.aborted
          ? "aborted"
          : n.some((P) => this.toolCallRows[P].get(toolUseId) === "dropped")
            ? "dropped"
            : C && !O
              ? "row_never_queued"
              : "timeout";
    if (S === "timeout" || S === "dropped") {
      for (let P of n) if (this.toolCallRows[P].get(toolUseId) === "queued") this.lanesNotAnswering.add(P);
    }
    logForDiagnosticsNoPII(
      S === "stored" || S === "closed" || S === "aborted" ? "info" : "warn",
      "cli_ccr_tool_call_upload_wait",
      {
        outcome: S,
        waited_ms: Date.now() - now,
        limit_ms: s,
        live_view_row: this.toolCallRows.client_events.get(toolUseId) ?? "none",
        transcript_row: n.includes("internal_events")
          ? (this.toolCallRows.internal_events.get(toolUseId) ?? "none")
          : "lane_unused",
      },
    );
  }
  toolCallRowReaches(e, n, s) {
    let r = this.toolCallRows[e].get(n);
    if (r !== void 0 && (r !== "queued" || s === "queued")) return Promise.resolve();
    return new Promise((h) => {
      let w = `${e} ${n}`,
        v = { until: s, reached: h },
        y = this.toolCallRowWaiters.get(w);
      if (y) y.push(v);
      else this.toolCallRowWaiters.set(w, [v]);
    });
  }
  noteToolCallRows(e, n, s) {
    let r = this.toolCallRows[e];
    for (let h of n) {
      if ((s === "queued" && r.has(h)) || (s === "dropped" && r.get(h) === "stored")) continue;
      (r.set(h, s), ce(r));
      let w = `${e} ${h}`,
        filtered = (this.toolCallRowWaiters.get(w) ?? []).filter((y) => {
          if (y.until === "queued" || s !== "queued") return (y.reached(), !1);
          return !0;
        });
      if (filtered.length > 0) this.toolCallRowWaiters.set(w, filtered);
      else this.toolCallRowWaiters.delete(w);
    }
  }
  noteToolCallRowsSettled(e, n, s) {
    if (!this.gatesToolCalls) return;
    if (n === "stored") this.lanesNotAnswering.delete(e);
    this.noteToolCallRows(
      e,
      s.flatMap((r) =>
        ("session_agent_id" in r && r.session_agent_id) || ("ephemeral" in r && r.ephemeral)
          ? []
          : getMainThreadToolUseIds(r.payload),
      ),
      n,
    );
  }
  clientRowsAreGuarded() {
    if (!this.guardsClientRows() || this.hasDisplayHooks === void 0) return !1;
    return ((this.displayHookSeen ||= this.hasDisplayHooks()), !this.displayHookSeen);
  }
  markOfRepliesShownAsStored() {
    return this.clientRowsAreGuarded() ? sessionIdBody(this.sessionId) || void 0 : void 0;
  }
  setDisplayHooksProbe(e) {
    this.hasDisplayHooks = e;
  }
  noteClientRowsSettled(e, n) {
    if (!this.clientRowsAreGuarded()) this.reportClientRowsOwed(this.clientRowsOwed.guardEnded(new Date()));
    let flattened = n.flatMap((h) => (h.ephemeral ? [] : [h.payload.uuid])),
      r = count(flattened, (h) => this.clientRowsOwed.rowsSentAgain.has(h));
    if (r > 0)
      if (((this.ownRowsWaitBehindRowsSentAgainSince = void 0), e === "stored"))
        logFeatureOk("ccr_client_rows_owed", { rows: r });
      else logFeatureBad("ccr_client_rows_owed", "upload_refused", { rows: r });
    this.reportClientRowsOwed(this.clientRowsOwed.rowsAnswered(flattened));
  }
  reportClientRowsOwed(e) {
    if (e !== void 0) this.workerState.enqueue({ internal_metadata: e });
  }
  async clientRowsOwedByEarlierWorkers(e) {
    if (this.clientRowsOwed.earlierSpans.length === 0) return [];
    return (await e(), this.guardsClientRows() ? this.clientRowsOwed.earlierSpans : []);
  }
  async tryClientRowsOwedByEarlierWorkers(e) {
    if (
      (this.reportClientRowsOwed(this.clientRowsOwed.earlierSpansTried(e)),
      !(await withDeadline(this.flushWorkerState(), WORKER_STATE_FLUSH_TIMEOUT_MS)))
    )
      logFeatureSad("ccr_client_rows_owed", "try_report_unanswered");
  }
  async sendOwedClientRowsAgain(e) {
    if (!this.guardsClientRows()) return;
    let n = Ji(
      e.map((s) => this.toClientEvent(s)),
      (s) => s.payload.uuid,
    );
    this.clientRowsOwed.earlierRowsSentAgain(n.map((s) => s.payload.uuid));
    try {
      await this.enqueueClientEvents(n, { urgent: !0 });
    } catch (error) {
      throw (this.clientRowsOwed.earlierRowsWithdrawn(), error);
    }
  }
  giveUpClientRowsOwedByEarlierWorkers() {
    this.reportClientRowsOwed(this.clientRowsOwed.earlierSpansGivenUp());
  }
  rowsSentAgainStepAside(e) {
    let { rowsSentAgain: rowsSentAgain } = this.clientRowsOwed;
    if (!e.some((r) => rowsSentAgain.has(r.payload.uuid))) return;
    if (this.eventUploader.backlog().unsent <= rowsSentAgain.size) {
      this.ownRowsWaitBehindRowsSentAgainSince = void 0;
      return;
    }
    if (
      ((this.ownRowsWaitBehindRowsSentAgainSince ??= Date.now()),
      Date.now() - this.ownRowsWaitBehindRowsSentAgainSince < ROWS_SENT_AGAIN_WAIT_MS)
    )
      return;
    this.ownRowsWaitBehindRowsSentAgainSince = void 0;
    let s = new Set(rowsSentAgain);
    (e.splice(0, e.length, ...e.filter((r) => !Ht(r, s))),
      this.eventUploader.withdraw((r) => Ht(r, s)),
      logFeatureSad("ccr_client_rows_owed", "upload_kept_failing", { rows: s.size }),
      this.clientRowsOwed.earlierRowsWithdrawn());
  }
  mayParkTextRow(e) {
    if (
      e.type !== "assistant" ||
      !this.streamEventTimer ||
      this.streamEventTimerIsSlow ||
      this.lastReportedHasSubscribers === !1 ||
      this.closed ||
      this.isLiveTwinRow(e)
    )
      return !1;
    let content = e.message.content;
    return Array.isArray(content) && content.length > 0 && content.every((s) => s.type === "text");
  }
  liveTwinTypes() {
    return this.holdRule === "served_policy" && this.liveTurnId !== void 0 && this.turnHold !== "open"
      ? this.flushPolicy?.liveTwinTypes
      : void 0;
  }
  isLiveTwinRow(e) {
    let liveTwinTypes = this.liveTwinTypes();
    return (
      liveTwinTypes !== void 0 &&
      (e.type === "tool_progress"
        ? e.heartbeat === !0
        : !("parent_tool_use_id" in e && e.parent_tool_use_id)) &&
      (e.type !== "user" ||
        (Array.isArray(e.message.content) && e.message.content.every((s) => s.type === "tool_result"))) &&
      (liveTwinTypes.has(e.type) || ("subtype" in e && liveTwinTypes.has(`${e.type}/${e.subtype}`)))
    );
  }
  takeParkedRows() {
    let mapped = this.parkedRows.map(({ event: event }) => event);
    return ((this.parkedRows = []), mapped);
  }
  mayWaitUnderHold(e) {
    if (this.isLiveOnlyRow(e)) return !0;
    if (e.type === "keep_alive" && this.holdRule === "served_policy")
      return this.seesModelCallBoundaries && !this.flushPolicy?.mustFlushTypes.has(e.type);
    if (
      e.type === "control_response" &&
      this.flushPolicy?.controlTrafficKeepsHold &&
      this.holdsAcrossModelCalls()
    )
      return (
        !this.flushPolicy.mustFlushTypes.has(e.type) && this.settingsRequestIds.has(e.response.request_id)
      );
    if (!isEphemeralStreamMessage(e))
      return (
        this.holdRule === "served_policy" &&
        this.seesModelCallBoundaries &&
        this.turnHold !== "open" &&
        this.flushPolicy?.mayWaitTypes.has(
          e.type === "system" && e.subtype === "task_notification" && this.heldShellTaskIds.has(e.task_id)
            ? "system/task_notification_foreground_shell"
            : classifyRowTypeForTelemetry(e),
        ) === !0 &&
        !this.flushPolicy.mustFlushTypes.has(e.type)
      );
    if (this.holdRule === "no_subscriber_flag" && !Vs) return !0;
    if (e.type === "user" && "isReplay" in e && e.isReplay) return !1;
    let flushPolicy = this.flushPolicy;
    if (!flushPolicy) return !0;
    if (e.type === "assistant" && flushPolicy.flushOnAssistant) return !1;
    return !flushPolicy.mustFlushTypes.has(e.type);
  }
  isLiveOnlyRow(e) {
    return (
      this.rowsMarkedLiveOnly.has(e) ||
      (this.followsServedPolicy && this.flushPolicy?.liveOnlyTypes.has(classifyRowTypeForTelemetry(e)) === !0)
    );
  }
  noteRequestingRow(e) {
    if ("parent_tool_use_id" in e && e.parent_tool_use_id) return;
    if ("resume_reason" in e && e.resume_reason) this.turnTookInput = !0;
    if (e.type === "assistant" || e.type === "user")
      ((this.toolResultEndsCall = e.type === "user" && hasToolResultContent(e.message)),
        (this.liveOnlyRequestingRow = void 0));
    if (e.type !== "system" || !("subtype" in e)) return;
    let n = e.subtype === "status" && "status" in e ? e.status : void 0;
    if (n === "compacting" || e.subtype === "compact_boundary") {
      let liveOnlyRequestingRow = this.liveOnlyRequestingRow;
      return ((this.liveOnlyRequestingRow = void 0), liveOnlyRequestingRow);
    }
    if (n !== "requesting") return;
    let s = jsonStringify("user_message_uuids" in e ? (e.user_message_uuids ?? null) : null),
      r =
        s === this.lastRequestingList &&
        this.toolResultEndsCall &&
        !this.turnTookInput &&
        this.followsServedPolicy &&
        this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT) === !0;
    ((this.lastRequestingList = s),
      (this.toolResultEndsCall = !1),
      (this.liveOnlyRequestingRow = r ? e : void 0),
      (this.heldRepeatUuid = void 0));
    return;
  }
  withStamp(e) {
    return {
      ...e,
      payload: {
        ...e.payload,
        live_turn_id: this.liveTurnId,
        live_index: this.nextLiveIndex++,
        emitted_at_ms: Date.now(),
      },
    };
  }
  toClientEvent(e) {
    let n = capLiveOnlyResponseSize(e, Ne),
      s = n.historical === !0,
      r = Ut(e) || isLiveOnlyResponse(n) || this.isLiveOnlyRow(e) || e === this.liveOnlyRequestingRow,
      h =
        n.type === "user" && n.is_virtual !== !0
          ? this.uploadedToolResult(n.tool_use_result, n.message)
          : n.tool_use_result;
    return {
      payload: {
        ...n,
        ...(h !== n.tool_use_result && { tool_use_result: h }),
        uuid: typeof n.uuid === "string" ? n.uuid : randomUUID(),
      },
      ...(s && { historical: !0 }),
      ...(r && { ephemeral: !0 }),
    };
  }
  uploadedToolResult(e, n) {
    let currentUploadTrim = this.currentUploadTrim(),
      r = stripInlineMediaBase64(e, currentUploadTrim);
    if (r !== e && !this.loggedToolResultBlank)
      ((this.loggedToolResultBlank = !0), logFeatureOk("ccr_tool_result_blank"));
    let h = dedupeMcpImageData(r, n, currentUploadTrim);
    if (h !== r && !this.loggedMcpImageBlank)
      ((this.loggedMcpImageBlank = !0), logFeatureOk("ccr_mcp_image_blank"));
    return h;
  }
  setStreamEventFlushIntervalMs(e) {
    if (
      ((this.streamEventFlushIntervalMs = parseFlushIntervalMs(
        "streamEventFlushIntervalMs",
        e,
        DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
      )),
      this.streamEventFlushIntervalMs <= 0 && this.streamEventTimer)
    )
      this.flushStreamEventBuffer();
    if (this.streamEventFlushIntervalMs <= 0) this.toolInputMayWait = !1;
  }
  setStreamEventFirstFlushMs(e) {
    this.streamEventFirstFlushMs = parseFlushIntervalMs("streamEventFirstFlushMs", e, 0);
  }
  setToolInputFlushMs(e) {
    this.toolInputFlushMs = Math.min(parseFlushIntervalMs("toolInputFlushMs", e, 0), Is);
  }
  setNoSubscriberStreamEventFlushIntervalMs(e) {
    let n = parseFlushIntervalMs("noSubscriberStreamEventFlushIntervalMs", e, 0);
    if (n === this.noSubscriberStreamEventFlushIntervalMs) return;
    ((this.noSubscriberStreamEventFlushIntervalMs = n), this.setHasSubscribers(void 0, "reset"));
  }
  setNoSubscriberUploadHoldMs(e) {
    let n = parseFlushIntervalMs("noSubscriberUploadHoldMs", e, 0);
    if (n === this.noSubscriberUploadHoldMs) return;
    ((this.noSubscriberUploadHoldMs = n), this.setHasSubscribers(void 0, "reset"));
  }
  setDropUnwatchedStreamEvents(e) {
    let n = e === !0;
    if (n === this.dropUnwatchedStreamEvents) return;
    (this.setHasSubscribers(void 0, "reset"), (this.dropUnwatchedStreamEvents = n));
  }
  onSubscribersReported;
  setSubscribersReportedListener(e) {
    this.onSubscribersReported = e;
  }
  tellSubscribersReported(e) {
    if (typeof e !== "boolean" || this.onSubscribersReported === void 0) return;
    if (e || !this.senderMayNotBeAttachedYet()) this.onSubscribersReported(e);
  }
  senderMayNotBeAttachedYet() {
    return Date.now() - this.lastInboundEventAtMs < Ys;
  }
  unwatched() {
    return this.noSubscriberUploadHoldMs > 0 && this.lastReportedHasSubscribers === !1;
  }
  mayHoldUploads() {
    return this.noSubscriberUploadHoldMs > 0 || this.servedPolicyHolds();
  }
  servedPolicyHolds() {
    return (this.flushPolicy?.maxEvents ?? 0) > 1 && this.followsServedPolicy;
  }
  checkpointForViewer(e) {
    if (this.closed || this.viewerCheckpointTimer || !this.holdsAcrossModelCalls()) return;
    this.viewerCheckpointTimer = setTimeout(
      (n, s) => {
        if (((n.viewerCheckpointTimer = null), n.holdsAcrossModelCalls()))
          n.uploadHeldRowsForViewer(s).catch(logError);
      },
      Math.max(0, this.lastViewerCheckpointAtMs + Ms - Date.now()),
      this,
      e,
    );
  }
  async uploadHeldRowsForViewer(e) {
    if (
      ((this.lastViewerCheckpointAtMs = Date.now()),
      this.flushPolicy?.emptyCheckpointKeepsHold && !this.modelCallStreamed)
    )
      this.setHasSubscribers(void 0, "watcher");
    else this.endWholeTurnHold(e);
    let liveTurnId = this.liveTurnId,
      s = this.nextLiveIndex - 1,
      droppedBeforeLiveTurn = this.droppedBeforeLiveTurn;
    (this.internalEventUploader.release(e),
      this.releaseClientEvents(e),
      await this.flush(),
      await this.enqueueClientEvents(
        [
          {
            payload: {
              type: "system",
              subtype: "checkpoint_done",
              uuid: randomUUID(),
              live_turn_id: liveTurnId,
              stored_through_live_index: this.droppedDurableBatches === droppedBeforeLiveTurn ? s : -1,
            },
            ephemeral: !0,
          },
        ],
        {},
      ));
  }
  endWholeTurnHold(e) {
    if (this.turnHold === "open") return;
    if (
      ((this.turnHold = "each_call"),
      this.uploadHoldTally.wholeTurnHoldEndedEarly(),
      !e || !this.flushPolicy?.holdAgain?.after.has(e))
    )
      this.holdsNoMoreThisTurn = !0;
  }
  openTurn() {
    ((this.lastRequestingList = void 0),
      (this.liveOnlyRequestingRow = void 0),
      (this.turnTookInput = !1),
      (this.modelCallStreamed = !1),
      (this.turnHold = "open"),
      this.uploadHoldTally.turnEnded(),
      (this.holdsNoMoreThisTurn = !1),
      (this.newestResponseId = void 0),
      this.unansweredCalls.clear());
  }
  holdsAcrossModelCalls() {
    return (
      this.holdRule === "served_policy" &&
      this.seesModelCallBoundaries &&
      this.flushPolicy?.holdAcrossModelCalls === !0
    );
  }
  decideHoldRule() {
    if (this.currentState !== "running" || this.shutdownReleased) return;
    if (this.servedPolicyHolds() && (this.seesModelCallBoundaries || this.lastReportedHasSubscribers === !1))
      return "served_policy";
    return this.unwatched() ? "no_subscriber_flag" : void 0;
  }
  applyUploadHold(e) {
    let decideHoldRule = this.decideHoldRule();
    ((this.holdRule = decideHoldRule),
      this.eventUploader.setHold(
        decideHoldRule &&
          this.laneHold(
            decideHoldRule,
            !this.seesModelCallBoundaries ? At : this.flushPolicy?.controlTrafficKeepsHold ? Mt : Ke,
            this.turnHold === "open" ? this.flushPolicy?.noTurnMaxAgeMs : void 0,
          ),
        e,
      ),
      this.internalEventUploader.setHold(
        decideHoldRule && this.laneHold(decideHoldRule, At, this.flushPolicy?.transcriptMaxAgeMs),
        e,
      ));
  }
  laneHold(e, n, s) {
    let flushPolicy = this.flushPolicy;
    if (e === "served_policy" && flushPolicy)
      return {
        rule: e,
        maxAgeMs: Math.min(
          s || flushPolicy.maxAgeMs,
          !this.seesModelCallBoundaries ? Yt : flushPolicy.holdAcrossModelCalls ? ve : Kt,
        ),
        maxItems: flushPolicy.maxEvents,
        maxBytes: flushPolicy.maxBytes,
        passes: n,
      };
    return { rule: "no_subscriber_flag", maxAgeMs: this.noSubscriberUploadHoldMs };
  }
  takeUpFlushPolicy(e) {
    let n = e ?? this.launchFlushPolicy,
      s = n == null ? void 0 : parseHoldPolicy(n);
    if (n != null && !s && !this.loggedUnreadableFlushPolicy)
      ((this.loggedUnreadableFlushPolicy = !0),
        logForDiagnosticsNoPII("warn", "cli_ccr_flush_policy_unreadable"));
    let flushPolicy = this.flushPolicy;
    if (!summarizeAssistantMessage(flushPolicy, s)) {
      if (
        ((this.flushPolicy = s),
        this.callsWhoseResultsWait.clear(),
        flushPolicy?.flushAfterTools !== s?.flushAfterTools ||
          !setsEqual(flushPolicy?.flushAfterToolNames, s?.flushAfterToolNames))
      )
        this.toolCallsWhoseResultReleases.clear();
      (logForDiagnosticsNoPII(
        "info",
        s
          ? flushPolicy
            ? "cli_ccr_flush_policy_changed"
            : "cli_ccr_flush_policy_adopted"
          : "cli_ccr_flush_policy_cleared",
        {
          ...(s && {
            max_events: s.maxEvents,
            max_age_ms: s.maxAgeMs,
            max_bytes: s.maxBytes ?? 0,
            flush_on_sampling_end: s.flushOnSamplingEnd,
            flush_on_assistant: s.flushOnAssistant,
            event_batch_upload: s.eventBatchUpload,
            hold_across_model_calls: s.holdAcrossModelCalls,
            hold_again: s.holdAgain !== void 0,
            may_wait_types: s.mayWaitTypes.size,
            may_wait_types_refused: s.mayWaitTypesRefused,
            flush_after_tool_names: s.flushAfterToolNames.size,
            settings_receipts_max_wait_ms: s.settingsReceiptsMaxWaitMs,
            messages_received_waits: s.messagesReceivedWaits,
            receipts_ride_uploads: s.receiptsRideUploads,
            flush_before_tools_wait_ms: s.flushBeforeToolsWaitMs,
            flush_after_tools: s.flushAfterTools,
            must_flush_types: s.mustFlushTypes.size,
            live_twin_types: s.liveTwinTypes.size,
            live_only_types: s.liveOnlyTypes.size,
            transcript_max_age_ms: s.transcriptMaxAgeMs,
            no_turn_max_age_ms: s.noTurnMaxAgeMs,
            merge_worker_reports: s.mergeWorkerReports,
            control_traffic_keeps_hold: s.controlTrafficKeepsHold,
            empty_checkpoint_keeps_hold: s.emptyCheckpointKeepsHold,
            first_turn_holds_each_call: s.firstTurnHoldsEachCall,
            later_worker_holds_first_turn: s.holdAgain?.laterWorkerHoldsFirstTurn === !0,
            settings_answers_max_wait_ms: s.settingsAnswersMaxWaitMs,
            init_max_wait_ms: s.initMaxWaitMs,
            metadata_waits_for_status: s.metadataWaitsForStatus.size,
            metadata_never_sent: s.metadataNeverSent.size,
            metadata_max_wait_ms: s.metadataMaxWaitMs,
            cost_report_max_wait_ms: s.costReportMaxWaitMs,
            policy_version: s.policyVersion ?? "",
          }),
          hold_enabled: this.followsServedPolicy,
        },
      ),
        this.applyUploadHold("reset"));
    }
  }
  logUploadHoldEnd(e, n, s, r, h, w) {
    if (h === "no_subscriber_flag") {
      logFeatureOk("ccr_no_subscriber_hold", {
        lane: fromEnum(e),
        reason: fromEnum(n),
        held_events: s,
        held_ms: r,
      });
      return;
    }
    if (e === "client_events") {
      if (
        (this.heldShellTaskIds.clear(),
        (this.heldRepeatUuid = void 0),
        (this.indexBehindHeldToolResult = void 0),
        n !== "round_trip")
      )
        this.endWholeTurnHold(n);
    }
    (this.uploadHoldTally.released(e, s, r),
      logForDiagnosticsNoPII("info", "cli_ccr_event_hold_release", {
        lane: e,
        reason: n,
        ...(w !== void 0 && { released_by: w }),
        held_events: s,
        held_ms: r,
      }));
  }
  uploadBody(e, n) {
    let s = { worker_epoch: this.workerEpoch, events: e };
    if (this.uploadHoldMarker())
      s.upload_hold = {
        held: n.held,
        flush_reason: n.reason,
        held_count: ke(n.heldCount),
        hold_age_ms: ke(n.holdAgeMs),
        inflight_retry_count: ke(n.retryCount),
        hold_rule: n.rule,
        post_index: ke(n.postIndex),
        ...(this.flushPolicy?.policyVersion !== void 0 && { policy_version: this.flushPolicy.policyVersion }),
      };
    return s;
  }
  retrySmaller(e, n, s, r, h = { bytes: s.bytes }) {
    let w = { count: n.length, kib: Math.round(h.bytes / 1024), retry_count: s.retryCount, timeout_ms: r };
    return (
      logForDebugging(
        `CCRClient: ${e} POST of ${w.count} event(s), ${w.kib} KiB got no response (the connection failed, or no answer within ${r}ms) after ${w.retry_count} earlier failure(s); ${h.bytes >= LARGE_BATCH_BYTES && s.cuttable ? "retrying it in smaller batches" : "retrying it"}`,
        { level: "warn" },
      ),
      logForDiagnosticsNoPII(
        "warn",
        e === "client_events" ? "cli_worker_events_no_response" : "cli_worker_internal_events_no_response",
        w,
      ),
      new cro(`${e} POST got no response`, LARGE_BATCH_BYTES)
    );
  }
  logUploadDrain(e, n) {
    if (!this.uploadHoldMarker()) return;
    logFeatureOk("ccr_upload_drain", {
      lane: fromEnum(e),
      trigger: fromEnum(n.trigger),
      rule: fromEnum(n.rule),
      held_events: n.heldEvents,
      held_ms: n.heldMs,
      posts: n.posts,
      rows: n.rows,
      max_rows_post: n.maxRowsPost,
      failed_posts: n.failedPosts,
      dropped_rows: n.droppedRows,
      other_posts: n.otherPosts,
      other_rows: n.otherRows,
      drain_ms: n.drainMs,
    });
  }
  logUndeliveredAtClose(e, n) {
    if (e === "client_events") this.undeliveredClientEventsAtClose ??= n;
    else this.undeliveredInternalEventsAtClose ??= n;
    if (this.shutdownKeepsClientEvents)
      logForDebugging(`CCRClient: ${e} lane closed at shutdown, ${n} undelivered`, {
        level: n > 0 ? "warn" : "info",
      });
    if (n <= 0) return;
    if (this.noSubscriberUploadHoldMs > 0 && this.viewerAbsentReported)
      logFeatureSad(
        "ccr_no_subscriber_hold",
        this.closingForSuccessor ? "undelivered_at_rebuild" : "undelivered_at_close",
        { lane: fromEnum(e), undelivered_events: n },
      );
    if (this.servedPolicyHolds())
      logForDiagnosticsNoPII("warn", "cli_ccr_event_hold_undelivered_at_close", {
        lane: e,
        undelivered_events: n,
        for_successor: this.closingForSuccessor,
      });
  }
  bufferEphemeral(e) {
    let n = this.streamEventFirstFlushMs > 0 && e.type === "stream_event" ? e.event.type : void 0,
      s = n === "content_block_start";
    if (s) this.firstContentFlushPending = !0;
    let r = e.type === "stream_event" && !e.parent_tool_use_id ? e.event : void 0;
    if (r?.type === "content_block_start")
      ((this.toolInputMayWait = r.content_block.type === "tool_use" && Cs.has(r.content_block.name)),
        (this.toolInputChars = 0));
    let h = this.toolInputChars >= Ps,
      w = !1;
    if (r?.type === "content_block_delta" && r.delta.type === "input_json_delta")
      ((this.toolInputChars += r.delta.partial_json.length),
        (w = this.toolInputMayWait && this.toolInputFlushMs > 0));
    if (this.dropUnwatchedStreamEvents && this.unwatchedPastGrace) {
      if (e.type === "stream_event") this.streamEventsDroppedUnwatched++;
      return;
    }
    this.streamEventBuffer.push(e);
    let v = this.firstContentFlushPending && n === "content_block_delta";
    if (v) this.firstContentFlushPending = !1;
    let y = s || (v && !w);
    if (
      v &&
      this.firstDeltaFlushTimer === null &&
      e.type === "stream_event" &&
      e.event.type === "content_block_delta" &&
      e.event.delta.type !== "input_json_delta" &&
      !(
        this.lastReportedHasSubscribers === !1 &&
        (this.noSubscriberStreamEventFlushIntervalMs > 0 || this.noSubscriberUploadHoldMs > 0)
      )
    )
      this.firstDeltaFlushTimer = setTimeout(() => {
        ((this.firstDeltaFlushTimer = null), this.flushStreamEventBuffer(!0));
      }, 0);
    let O = this.streamEventTimerIsSlow && !w;
    if (this.streamEventTimer && !y && !O) return;
    let C = w && h;
    this.streamEventTimerIsSlow = C;
    let now = Date.now(),
      max = Math.max(this.toolInputFlushMs, this.streamEventFlushIntervalMs),
      P = y
        ? Math.min(this.streamEventFirstFlushMs, this.streamEventFlushIntervalMs)
        : C
          ? Math.min(Math.max(this.streamEventsTakenAt + max - now, this.streamEventFlushIntervalMs), max)
          : this.streamEventFlushIntervalMs;
    if (P > this.streamEventFlushIntervalMs && !this.loggedToolInputFlush)
      ((this.loggedToolInputFlush = !0), logFeatureOk("ccr_tool_input_flush"));
    let W =
      this.lastReportedHasSubscribers === !1
        ? Math.max(this.noSubscriberStreamEventFlushIntervalMs, this.noSubscriberUploadHoldMs, P)
        : P;
    if (this.streamEventTimer) {
      if (now + W >= this.streamEventFlushDueAt) return;
      clearTimeout(this.streamEventTimer);
    } else this.streamEventBufferedAt = now;
    ((this.streamEventFlushDueAt = now + W),
      (this.streamEventTimer = setTimeout(() => void this.flushStreamEventBuffer(), W)));
  }
  setHasSubscribers(e, n) {
    this.hasSubscribersReports++;
    let s = typeof e === "boolean" && (e || !this.senderMayNotBeAttachedYet()) ? e : void 0,
      lastReportedHasSubscribers = this.lastReportedHasSubscribers;
    if (((this.lastReportedHasSubscribers = s), s === !0)) this.viewerReportedSinceLastFalse = !0;
    else if (s === !1 && this.viewerReportedSinceLastFalse)
      ((this.viewerReportedSinceLastFalse = !1), (this.lastViewerLeftAtMs = Date.now()));
    let unwatchedPastGrace = this.unwatchedPastGrace;
    if (
      ((this.unwatchedPastGrace = s === !1 && Date.now() - this.lastViewerLeftAtMs >= Qs),
      this.dropUnwatchedStreamEvents && unwatchedPastGrace !== this.unwatchedPastGrace)
    )
      logForDebugging(
        this.unwatchedPastGrace
          ? "CCRClient: no subscribers reported; dropping stream deltas until one is"
          : `CCRClient: resuming stream deltas (${s === !0 ? "watcher" : n})`,
      );
    if (lastReportedHasSubscribers === !1 && s !== !1 && this.streamEventTimer) this.flushStreamEventBuffer();
    let w = s === !0 ? "watcher" : n;
    if (s === !1) this.viewerAbsentReported = !0;
    else if (this.viewerAbsentReported && w === "watcher") {
      if (((this.viewerAbsentReported = !1), this.holdRule === "served_policy")) {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        (this.releaseClientEvents("watcher"), this.internalEventUploader.release("watcher"));
      }
    }
    this.applyUploadHold(w);
  }
  async flushStreamEventBuffer(e = !1) {
    let { events: events, release: release } = this.takeStreamEventBuffer(e);
    if (events.length > 0) {
      if (release) this.releaseTranscriptLane(release);
      await this.enqueueClientEvents(
        events,
        release ? { release: release } : { since: this.streamEventBufferedAt },
      );
    }
  }
  enqueueClientEvents(e, n) {
    for (let s of this.trackedFrameUploads("enqueuedAtMs")) {
      let found = e.find((v) => v.payload.uuid === s.uuid);
      if (!found) continue;
      let inFlightBatch = this.eventUploader.inFlightBatch(),
        w;
      if (n.release === void 0 && this.eventUploader.holdsOnArrival(found)) w = "hold";
      else if (inFlightBatch !== void 0)
        w = inFlightBatch.some((v) => !v.ephemeral) ? "durable_post" : "ephemeral_post";
      else if (this.eventUploader.backlog().backingOff) w = "retry_backoff";
      else w = "none";
      ((s.timing.enqueuedAtMs = performance.now()), (s.timing.queuedBehind = w));
    }
    return this.eventUploader.enqueue(e, n);
  }
  releaseClientEvents(e, n) {
    this.eventUploader.release(e, n);
  }
  offerToEventsPost(e, n) {
    if (
      n.rule !== "served_policy" ||
      n.retryCount > 0 ||
      this.flushPolicy?.eventBatchUpload !== !0 ||
      this.ridesAreOff()
    )
      return;
    let { promise: promise, resolve: resolve } = Promise.withResolvers();
    return (
      (this.ridingRows = { rows: e, bytes: n.bytes, settle: resolve }),
      queueMicrotask(() => {
        if (this.ridingRows?.rows === e && !this.liveViewLaneSendsMore()) this.giveBackRidingRows();
      }),
      promise
    );
  }
  liveViewLaneSendsMore() {
    let { unsent: unsent, backingOff: backingOff } = this.eventUploader.backlog();
    return (
      !backingOff &&
      unsent > (this.eventUploader.inFlightBatch()?.length ?? 0) + this.eventUploader.held().count
    );
  }
  ridesAreOff() {
    return this.ridesRefused || performance.now() < this.ridesPausedUntilMs;
  }
  noteRouteOnlyFailure(e) {
    if ((this.routeOnlyFailures++, this.routeOnlyFailures < 2 && e !== 405 && e !== 501)) return;
    let min = Math.min(RIDE_PAUSE_BASE_MS * 2 ** this.ridePauses, RIDE_PAUSE_MAX_MS);
    (this.ridePauses++,
      (this.ridesPausedUntilMs = performance.now() + min),
      logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_paused", { status: e, pause_ms: min }));
  }
  giveBackRidingRows() {
    (this.ridingRows?.settle(!1), (this.ridingRows = void 0));
  }
  settlesTakenRiders(e) {
    let n = () => {
      (this.takenRiders?.settle(!1), (this.takenRiders = void 0));
    };
    return (s, r) => {
      let h = e(s, r);
      return (h.then(n, n), h);
    };
  }
  actsOnSubscribersReports() {
    return (
      this.noSubscriberStreamEventFlushIntervalMs > 0 ||
      this.noSubscriberUploadHoldMs > 0 ||
      this.dropUnwatchedStreamEvents ||
      this.servedPolicyHolds()
    );
  }
  takeStreamEventBuffer(e = !1) {
    if (!e) {
      if (this.streamEventTimer) {
        if (this.firstTextFrameUpload)
          recordTimerLateness(this.firstTextFrameUpload.timing, Date.now() - this.streamEventFlushDueAt);
        (clearTimeout(this.streamEventTimer), (this.streamEventTimer = null));
      }
      if (((this.streamEventTimerIsSlow = !1), this.firstDeltaFlushTimer))
        (clearTimeout(this.firstDeltaFlushTimer), (this.firstDeltaFlushTimer = null));
    }
    let n,
      s = e ? [] : this.parkedRows;
    for (let { message: message } of s) n ??= this.releaseFor(message);
    if (this.streamEventBuffer.length === 0) return { events: e ? [] : this.takeParkedRows(), release: n };
    let r = [],
      h,
      w = 0;
    for (let C of this.streamEventBuffer) {
      if (C.type === "stream_event") {
        r.push(C);
        continue;
      }
      ((w =
        (h !== void 0 && C.estimated_tokens - C.estimated_tokens_delta === h.estimated_tokens ? w : 0) +
        C.estimated_tokens_delta),
        (h = C));
    }
    ((this.streamEventBuffer = []), (this.streamEventsTakenAt = Date.now()));
    for (let C of this.trackedFrameUploads("enqueuedAtMs")) C.uuid = findCoalescedRunHead(r, C.uuid);
    let mapped = coalesceStreamEvents(r)
      .filter((C) => {
        let byteLength = Buffer.byteLength(jsonStringify(C));
        if (byteLength <= Oun) return !0;
        return (dropOversizeStreamEvent(C, byteLength), !1);
      })
      .map((C) => ({ payload: C, ephemeral: !0 }));
    if (h) mapped.push(this.toClientEvent({ ...h, estimated_tokens_delta: w }));
    if (!e) mapped.push(...this.takeParkedRows());
    return { events: mapped, release: n };
  }
  currentUploadTrim() {
    let uploadTrim = this.uploadTrim();
    return isPlainObject(uploadTrim) ? uploadTrim : EMPTY_UPLOAD_TRIM;
  }
  async writeInternalEvent(
    e,
    n,
    { isCompaction: isCompaction = !1, agentId: agentId, preservedEventIds: preservedEventIds } = {},
  ) {
    let w = preservedEventIds,
      v = trimPreservedMessagesMetadata(n);
    if (w && w.length > L1t)
      (logEvent("tengu_ccr_preserved_event_ids_clamped", {
        originalCount: w.length,
        cap: L1t,
        payloadClamped: v !== null,
      }),
        (w = w.slice(-L1t)));
    let y = v ?? n;
    if (this.currentUploadTrim().envelope === !0) {
      let x = stripTranscriptOnlyFields(y, this.keepsRequestId);
      if (x !== y && !this.loggedTranscriptEnvelopeStrip)
        ((this.loggedTranscriptEnvelopeStrip = !0), logFeatureOk("ccr_worker_envelope_strip"));
      if (
        !this.loggedRequestIdKept &&
        isAssistantWithMessageId(x) &&
        typeof x.requestId === "string" &&
        this.keepsRequestId()
      )
        ((this.loggedRequestIdKept = !0), logFeatureOk("ccr_worker_error_request_id_kept"));
      y = x;
    }
    if (e === "transcript" && y.type === "user" && y.isVirtual !== !0) {
      let uploadedToolResult = this.uploadedToolResult(y.toolUseResult, y.message);
      if (uploadedToolResult !== y.toolUseResult) y = { ...y, toolUseResult: uploadedToolResult };
    }
    let O = {
        payload: { type: e, ...y, uuid: typeof y.uuid === "string" ? y.uuid : randomUUID() },
        ...(isCompaction && { is_compaction: !0 }),
        ...(agentId && { session_agent_id: agentId }),
        ...(w?.length && { preserved_event_ids: w }),
      },
      C = [O],
      U = agentId || "",
      S = this.rowsAwaitingCompactSummary.get(U);
    if (
      e === "transcript" &&
      (S !== void 0 || (isCompaction && this.rowsAwaitingCompactSummaryAtClose === void 0))
    ) {
      if (S === void 0)
        ((S = { rows: [], timer: this.startCompactSummaryWaitTimer(U) }),
          this.rowsAwaitingCompactSummary.set(U, S));
      S.rows.push(O);
      let x =
        y.isCompactSummary === !0
          ? "summary"
          : y.type === "user" || y.type === "assistant"
            ? "user_or_assistant_row"
            : S.rows.length >= Gs
              ? "row_cap"
              : void 0;
      if (x === void 0) return;
      C = this.takeRowsAwaitingCompactSummary(U, x);
    }
    let P = e === "transcript" && y.type === "user" && this.toolResultReleases(y.message),
      W = this.gatesToolCalls && e === "transcript" && !agentId ? getMainThreadToolUseIds(y) : [];
    if (
      (await this.queueInternalEvents(
        C,
        P
          ? "tool_result"
          : W.some((x) => this.awaitedToolCalls.has(x))
            ? "tool_call"
            : !this.transcriptRowMayWait(e, y, agentId)
              ? "event"
              : void 0,
      ),
      e === "transcript")
    )
      this.transcriptLaneInUse = !0;
    this.noteToolCallRows("internal_events", W, "queued");
  }
  async queueInternalEvents(e, n) {
    let s = e[0]?.is_compaction === !0 && this.holdRule !== void 0;
    if (s) this.releaseClientEvents("event", "compaction");
    let mapped = (
        e[0]?.is_compaction === !0 && e[0].session_agent_id === void 0
          ? (this.rowsRepeatedAfterCompaction?.() ?? [])
          : []
      ).map(({ eventType: eventType, payload: payload }) => ({
        payload: { type: eventType, ...payload, uuid: randomUUID() },
      })),
      w = [...e, ...mapped];
    (this.markInternalEventPostWatch((v) => v.noteQueued(w)),
      await this.internalEventUploader.enqueue(w, { together: !0, release: s ? "event" : n }));
  }
  startCompactSummaryWaitTimer(e) {
    let n = setTimeout(
      (s, r) => {
        let h = s.rowsAwaitingCompactSummary.get(r);
        if (s.closed || h === void 0) return;
        if (!s.internalEventUploader.hasRoomFor(1)) {
          h.timer = s.startCompactSummaryWaitTimer(r);
          return;
        }
        s.queueInternalEvents(s.takeRowsAwaitingCompactSummary(r, "timeout"), void 0).catch(logError);
      },
      Ks,
      this,
      e,
    );
    return (n.unref?.(), n);
  }
  takeRowsAwaitingCompactSummary(e, n) {
    let s = this.rowsAwaitingCompactSummary.get(e);
    (this.rowsAwaitingCompactSummary.delete(e), clearTimeout(s?.timer));
    let r = s?.rows ?? [];
    if (n !== "summary" && n !== "close")
      logForDiagnosticsNoPII("info", "cli_worker_compaction_marker_uploaded_without_summary", {
        reason: n,
        count: r.length,
        subagent: e !== "",
      });
    return r;
  }
  transcriptRowMayWait(e, n, s) {
    let flushPolicy = this.flushPolicy;
    if (this.holdRule !== "served_policy" || !flushPolicy) return !0;
    let h = e === "transcript" ? n.type : e;
    if (typeof h !== "string" || flushPolicy.mustFlushTypes.has(h)) return !1;
    if (h === "user") {
      if (flushPolicy.holdAcrossModelCalls && this.turnHold === "open" && !s) return !1;
      return (
        n.toolUseResult !== void 0 ||
        hasToolResultContent(n.message) ||
        n.isMeta === !0 ||
        n.isVirtual === !0 ||
        n.isCompactSummary === !0
      );
    }
    return !(h === "assistant" && flushPolicy.flushOnAssistant);
  }
  flushInternalEvents(e) {
    return this.internalEventUploader.flush(e);
  }
  watchInternalEventPosts() {
    let e = new UploadBacklogStats(this.internalEventUploader.backlog().unsent);
    return (
      (this.internalEventPostWatch = e),
      (n) => {
        if (this.internalEventPostWatch === e) this.internalEventPostWatch = void 0;
        return e.seen(n);
      }
    );
  }
  markInternalEventPostWatch(e) {
    let internalEventPostWatch = this.internalEventPostWatch;
    if (internalEventPostWatch === void 0) return;
    try {
      e(internalEventPostWatch);
    } catch (error) {
      ((this.internalEventPostWatch = void 0), logError(error));
    }
  }
  hasUnsentUploads() {
    let { unsentClientEvents: unsentClientEvents, unsentInternalEvents: unsentInternalEvents } =
      this.uploadBacklog();
    return (
      this.streamEventTimer !== null ||
      unsentClientEvents > 0 ||
      unsentInternalEvents > 0 ||
      this.deliveryUploader.backlog().unsent > 0 ||
      this.workerState.unsent
    );
  }
  uploadBacklog() {
    let backlog = this.eventUploader.backlog(),
      backlog_2 = this.internalEventUploader.backlog(),
      filtered = [backlog.inFlightMs, backlog_2.inFlightMs].filter((r) => r !== void 0);
    return {
      unsentClientEvents: backlog.unsent,
      unsentInternalEvents: backlog_2.unsent + this.countRowsAwaitingCompactSummary(),
      oldestInFlightMs: filtered.length ? Math.max(...filtered) : void 0,
      backingOff: backlog.backingOff || backlog_2.backingOff,
    };
  }
  async postInternalEventsBatch(e, n = {}) {
    let refuseInternalEventsCall = this.refuseInternalEventsCall(!0);
    if (refuseInternalEventsCall) return refuseInternalEventsCall;
    let epochMismatchCount = this.epochMismatchCount;
    try {
      let request = await this.request(
        "post",
        "/worker/internal-events",
        { worker_epoch: this.workerEpoch, events: e },
        "internal events batch",
        { parseBody: !0, countTowardEscalation: !1, signal: n.signal },
      );
      if (request.ok) {
        let safeParse = eventBatchResultSchema().safeParse(request.data);
        return { ok: !0, results: safeParse.success ? safeParse.data.results : void 0 };
      }
      return this.internalEventsFailure(request, epochMismatchCount);
    } catch (error) {
      return this.internalEventsFailure(
        { reason: `fetch_failed:${mergeClients(error)}` },
        epochMismatchCount,
      );
    }
  }
  async getInternalEventsPage(e, n = {}) {
    let refuseInternalEventsCall = this.refuseInternalEventsCall(!1);
    if (refuseInternalEventsCall) return refuseInternalEventsCall;
    let r = new URL(`${this.sessionBaseUrl}/worker/internal-events`);
    if (e.limit !== void 0) r.searchParams.set("limit", String(e.limit));
    if (e.agentId) r.searchParams.set("session_agent_id", e.agentId);
    if (e.subagents) r.searchParams.set("subagents", "true");
    if (e.cursor) r.searchParams.set("cursor", e.cursor);
    else if (e.afterEventId) r.searchParams.set("after_event_id", e.afterEventId);
    let epochMismatchCount = this.epochMismatchCount,
      w;
    try {
      let authHeaders = this.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0) return { ok: !1, reason: "no_auth_headers" };
      w = n.signal ? createCombinedAbortSignal(n.signal, { timeoutMs: 30000, refTimer: !0 }) : void 0;
      let y = await fetch(r, {
        headers: {
          ...authHeaders,
          "anthropic-version": "2023-06-01",
          "anthropic-client-platform": getClientPlatform(),
          "User-Agent": claudeCodeUserAgent(),
        },
        signal: w?.signal ?? AbortSignal.timeout(30000),
        ...getProxyFetchOptions({ url: r.toString() }),
      });
      if (y.ok) {
        let P;
        try {
          P = await y.json();
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
        let safeParse = sessionEventsPageSchema().safeParse(P);
        if (!safeParse.success)
          return (
            logForDiagnosticsNoPII("warn", "cli_worker_internal_events_page_foreign"),
            { ok: !1, status: y.status, reason: "foreign_body" }
          );
        let x = Number(y.headers.get("content-length") ?? Number.NaN);
        return {
          ok: !0,
          data: safeParse.data.data.map(normalizePayload),
          ...(safeParse.data.next_cursor && { nextCursor: safeParse.data.next_cursor }),
          bytes: Number.isFinite(x) ? x : null,
        };
      }
      let O, C, U, S;
      if (y.status === 409) {
        let P = await readConflictReason(y);
        if (this.closed) S = P ?? this.lastEpochMismatchCause ?? "epoch_conflict";
        else
          try {
            this.handleEpochMismatch(P);
          } catch (error) {
            logForDebugging(`CCRClient: onEpochMismatch threw during a page read: ${errorMessage(error)}`);
          }
      } else if (y.status === 404)
        try {
          let body = await y.json();
          if (typeof body?.error?.type === "string") O = body.error.type;
          if (typeof body?.error?.resource_type === "string") C = body.error.resource_type;
        } catch {}
      else {
        if (y.status === 429) {
          let P = parseInt(y.headers.get("retry-after") ?? "", 10);
          if (!isNaN(P) && P >= 0) U = P * 1000;
        }
        y.body?.cancel();
      }
      return (
        logForDebugging(`CCRClient: internal events page returned ${y.status}`, { level: "warn" }),
        logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
          method: "get",
          path: "/worker/internal-events",
          status: y.status,
        }),
        this.internalEventsFailure(
          { status: y.status, retryAfterMs: U, reason: `http_${y.status}` },
          epochMismatchCount,
          { errorType: O, resourceType: C, closedConflict: S },
        )
      );
    } catch (error) {
      return (
        logForDebugging(`CCRClient: internal events page failed: ${errorMessage(error)}`, { level: "warn" }),
        this.internalEventsFailure({ reason: `fetch_failed:${mergeClients(error)}` }, epochMismatchCount)
      );
    } finally {
      w?.cleanup();
    }
  }
  refuseInternalEventsCall(e) {
    if (this.closed)
      return {
        ok: !1,
        reason: "client_closed",
        ...(this.lastEpochMismatchCause && { conflict: this.lastEpochMismatchCause }),
      };
    if (e && this.workerEpoch <= 0) return { ok: !1, reason: "not_initialized" };
    return;
  }
  internalEventsFailure(
    e,
    n,
    { errorType: errorType, resourceType: resourceType, closedConflict: closedConflict } = {},
  ) {
    let w =
        closedConflict ??
        (this.epochMismatchCount > n
          ? this.lastEpochMismatchCause
          : e.status === 409
            ? (this.lastEpochMismatchCause ?? "epoch_conflict")
            : void 0),
      v = e.status ?? (w && CONFLICT_REASON_IS_SUPERSEDED[w] ? 409 : void 0);
    return {
      ok: !1,
      reason: v === 409 ? "http_409" : (e.reason ?? "unknown"),
      ...(v !== void 0 && { status: v }),
      ...(e.retryAfterMs !== void 0 && { retryAfterMs: e.retryAfterMs }),
      ...(w && { conflict: w }),
      ...(errorType && { errorType: errorType }),
      ...(resourceType && { resourceType: resourceType }),
    };
  }
  droppedInternalEventBatches = 0;
  get droppedInternalBatches() {
    return this.droppedInternalEventBatches;
  }
  refusedInternalEventUuids = new Set();
  refusedInternalEvents(e) {
    return e.filter((n) => this.refusedInternalEventUuids.has(n));
  }
  noteRefusedInternalEvents(e) {
    for (let { payload: payload, session_agent_id: session_agent_id } of e)
      if (session_agent_id === void 0) this.refusedInternalEventUuids.add(payload.uuid);
    let n = this.refusedInternalEventUuids.size - MAX_REFUSED_INTERNAL_EVENT_UUIDS;
    for (let refusedInternalEventUuid of this.refusedInternalEventUuids) {
      if (n-- <= 0) break;
      this.refusedInternalEventUuids.delete(refusedInternalEventUuid);
    }
  }
  dropOrphanedHandedOffLines(e) {
    let n = 0;
    for (let s = 0; s < e.length;) {
      let r = e[s],
        { payload: payload } = r;
      if (
        r.session_agent_id === void 0 &&
        (payload.handedOff === !0 ||
          (payload.type === "system" && payload.subtype === UPGRADE_RELAY_MARKER)) &&
        !(payload.type === "user" && !hasToolResultContent(payload.message)) &&
        typeof payload.parentUuid === "string" &&
        this.refusedInternalEventUuids.has(payload.parentUuid)
      ) {
        (e.splice(s, 1), n++, this.noteRefusedInternalEvents([r]));
        continue;
      }
      s++;
    }
    return n;
  }
  droppedDeliveryAckBatches = 0;
  deliveryAcksWaitingForRoom = new Set();
  async flushDeliveryAcksConfirmed() {
    let droppedDeliveryAckBatches = this.droppedDeliveryAckBatches;
    if (this.receiptsRide) await this.receiptsRide.promise;
    return (
      this.sendWaitingReceipts(),
      await Promise.all(this.deliveryAcksWaitingForRoom),
      await this.deliveryUploader.flush(),
      this.droppedDeliveryAckBatches === droppedDeliveryAckBatches && !this.closed
    );
  }
  flushDeliveryAcks(e) {
    if (this.receiptsRide) return this.receiptsRide.promise.then(() => this.flushDeliveryAcks(e));
    return (this.sendWaitingReceipts(), this.deliveryUploader.flush(e));
  }
  async flush(e) {
    if (this.waitingAnswers.length > 0) await this.writeEvents([]);
    return (await this.flushStreamEventBuffer(), this.eventUploader.flush(e));
  }
  withdrawQueuedControlRequest(e) {
    let n = (s) => !s.ephemeral && s.payload.type === "control_request" && s.payload.request_id === e;
    return this.eventUploader.withdraw(n);
  }
  droppedDurableEventBatches = 0;
  get droppedDurableBatches() {
    return this.droppedDurableEventBatches;
  }
  takeUndeliveredClientEvents() {
    return this.eventUploader.takeUndelivered().filter((e) => !e.ephemeral);
  }
  discardUndeliveredClientEvents() {
    let filtered = this.eventUploader.peekUndelivered().filter((n) => !n.ephemeral);
    return (this.eventUploader.discardUndelivered(), filtered);
  }
  adoptClientEvents(e) {
    if (e.length === 0) return;
    this.eventUploader.enqueue(e);
  }
  async flushWorkerState() {
    return this.workerState.flush();
  }
  droppedWorkerStatePatchCount = 0;
  droppedOwedMetadataPatchCount = 0;
  get droppedWorkerStatePatches() {
    return this.droppedWorkerStatePatchCount;
  }
  async readInternalEvents(e, n, s) {
    return CCRClient.readInternalEventsFrom(this.readSource, e, n, s);
  }
  async readInternalEventsForCatchUp(e, n, s) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      { limit: "1000", ...(n && { after_event_id: n }) },
      "internal_events",
      { maxAttempts: WORKER_STATE_MAX_ATTEMPTS, signal: e },
      s,
    );
  }
  static readInternalEventsFrom(e, n, s, r) {
    return CCRClient.paginatedGet(
      e,
      "/worker/internal-events",
      { limit: "1000", ...(n && { after_event_id: n }) },
      "internal_events",
      { signal: s },
      r,
    );
  }
  async readSubagentInternalEvents() {
    return CCRClient.readSubagentInternalEventsFrom(this.readSource);
  }
  static readSubagentInternalEventsFrom(e) {
    return CCRClient.paginatedGet(
      e,
      "/worker/internal-events",
      { subagents: "true", limit: "1000" },
      "subagent_events",
    );
  }
  async readAgentInternalEvents(e, n, s, r) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      { session_agent_id: e, limit: "1000", ...(r && { after_event_id: r }) },
      "agent_events",
      { maxAttempts: WORKER_STATE_MAX_ATTEMPTS, signal: n },
      s,
      Boolean(r),
    );
  }
  async readAgentMetadataEvents(e, n) {
    let r = isEssentialTrafficOnly() ? "essential-traffic-only" : this.providerWithheldReason();
    if (r !== void 0)
      return (
        logForDiagnosticsNoPII("info", "cli_worker_request_withheld", {
          method: "post",
          path: "/worker/agent-metadata-events/batch-get",
          reason: r,
        }),
        null
      );
    let h = [];
    for (let w of xbt(uniq(e), INTERNAL_EVENT_UUID_BATCH_SIZE)) {
      let authHeaders = this.readSource.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0) return null;
      let withRetry = await CCRClient.getWithRetry(
        { ...this.readSource, onConflict: void 0 },
        `${this.readSource.sessionBaseUrl}/worker/agent-metadata-events/batch-get`,
        authHeaders,
        "agent_metadata_events",
        void 0,
        (O) => {
          logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
            method: "post",
            path: "/worker/agent-metadata-events/batch-get",
            status: O,
          });
        },
        {
          signal: n,
          postJson: jsonStringify({ session_agent_ids: w }),
          permanentStatuses: [403, 404, 501],
          readBody: async (O) => {
            let C;
            try {
              C = await O.json();
            } catch (error) {
              if (!(error instanceof SyntaxError)) throw error;
            }
            let safeParse = agentMetadataEventsSchema().safeParse(C);
            if (!safeParse.success)
              return (logForDiagnosticsNoPII("warn", "cli_worker_agent_metadata_events_foreign"), null);
            return safeParse.data.data ?? [];
          },
        },
      );
      if (withRetry === null) return null;
      h.push(...withRetry);
    }
    return h;
  }
  static async paginatedGet(e, n, s, r, h = {}, w, v = !1) {
    let authHeaders = e.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) return null;
    let O = v ? { ...h, maxAttempts: 1 } : h,
      C = [],
      U,
      S = 0,
      P = 0,
      W = 0,
      x = 0,
      z = null;
    do {
      let K = new URL(`${e.sessionBaseUrl}${n}`);
      for (let [L, I] of Object.entries(s)) K.searchParams.set(L, I);
      if (U) (K.searchParams.set("cursor", U), K.searchParams.delete("after_event_id"));
      let Y = !U && s.after_event_id !== void 0,
        R,
        withRetry = await CCRClient.getWithRetry(
          e,
          K.toString(),
          authHeaders,
          r,
          (L) => {
            (S++, (z ??= L.headers.get("content-encoding")));
            let I = L.headers.get("content-length");
            if (I !== null && x !== null) x += Number(I);
            else x = null;
          },
          (L, I) => {
            if (!Y) return;
            if (L === 400) R = "rejected";
            else if (I === "after_event_id_not_found") R = "not-found";
          },
          w === void 0
            ? O
            : {
                ...O,
                unencoded: !w.takesCompressedPages,
                readBody: async (L) => {
                  let I = L.headers.get("content-encoding");
                  if (!w.takesCompressedPages && I !== null && I !== "identity")
                    return (await L.body?.cancel(), { encodedBody: !0 });
                  let G = await readBodyCapped(L, w.maxBytes - W);
                  if (G === null) return { pastMaxBytes: !0 };
                  let X = w.parsePage ? await w.parsePage(G.text) : jsonParse(G.text);
                  if (!isPlainObject(X) || !Array.isArray(X.data) || !X.data.every(isPlainObject))
                    throw Error("CCRClient: a page is no list of events");
                  return ((W += G.bytes), X);
                },
              },
        );
      if (withRetry?.encodedBody)
        return {
          events: [],
          stats: { pageCount: S, bytesReceived: x, contentEncoding: z ?? "none" },
          encodedBody: !0,
        };
      if (!withRetry) {
        if (R) {
          (logForDebugging(
            `CCRClient: after_event_id ${R === "rejected" ? "rejected by server (gate off)" : "not found (stale anchor)"} \u2014 refetching without anchor`,
            { level: "warn" },
          ),
            logForDiagnosticsNoPII(
              "warn",
              R === "rejected" ? "cli_worker_after_event_id_rejected" : "cli_worker_after_event_id_not_found",
              { context: r },
            ));
          let { after_event_id: after_event_id, ...I } = s,
            paginatedGet = await CCRClient.paginatedGet(e, n, I, r, h, w);
          if (!paginatedGet) return null;
          return { ...paginatedGet, anchorFallback: R };
        }
        return null;
      }
      for (let L of withRetry.data ?? []) if (!isClassifierDumpEvent(L.payload)) C.push(normalizePayload(L));
      if (
        ((P += Math.max(1, withRetry.data?.length ?? 0)),
        (v && withRetry.next_cursor) ||
          (w !== void 0 &&
            (P > w.maxEvents ||
              withRetry.pastMaxBytes === !0 ||
              (withRetry.data ?? []).some((L) => !isTimestampWithinLimit(L, w.maxTimestampChars)))))
      )
        return {
          events: [],
          stats: { pageCount: S, bytesReceived: x, contentEncoding: z ?? "none" },
          overBound: !0,
        };
      U = withRetry.next_cursor;
    } while (U);
    return (
      logForDebugging(
        `CCRClient: Read ${C.length} internal events from ${n}${s.subagents ? " (subagents)" : ""}`,
      ),
      { events: C, stats: { pageCount: S, bytesReceived: x, contentEncoding: z ?? "none" } }
    );
  }
  static getWithRetry(e, n, s, r, h, w, v = {}) {
    return CCRClient.getWithRetryNow(e, n, s, r, h, w, v);
  }
  static async getWithRetryNow(
    e,
    n,
    s,
    r,
    h,
    w,
    {
      maxAttempts: maxAttempts = DEFAULT_MAX_ATTEMPTS,
      signal: signal,
      readBody: readBody,
      unencoded: unencoded,
      postJson: postJson,
      permanentStatuses: permanentStatuses,
    },
  ) {
    let P = 0;
    for (let W = 1; W <= maxAttempts; W++) {
      if (signal?.aborted) return null;
      let x;
      try {
        if (
          ((x = await proxyAwareFetch(
            n,
            {
              ...(postJson !== void 0 && { method: "POST", body: postJson }),
              headers: {
                ...s,
                ...(postJson !== void 0 && { "Content-Type": "application/json" }),
                "anthropic-version": "2023-06-01",
                "anthropic-client-platform": getClientPlatform(),
                "User-Agent": claudeCodeUserAgent(),
                ...(unencoded && { "Accept-Encoding": "identity" }),
              },
              ...(unencoded && { decompress: !1 }),
              signal: signal
                ? AbortSignal.any([AbortSignal.timeout(30000), signal])
                : AbortSignal.timeout(30000),
              ...getProxyFetchOptions({ url: n }),
            },
            e.ownConnectionPool,
          )),
          x.ok)
        ) {
          let K = readBody ? await readBody(x) : await x.json();
          return (h?.(x), K);
        }
      } catch (error) {
        if (signal?.aborted) return null;
        if (
          (logForDebugging(
            `CCRClient: GET ${n} failed (attempt ${W}/${maxAttempts}): ${errorMessage(error)}`,
            { level: "warn" },
          ),
          error instanceof RangeError && ++P >= RETRY_COUNT_3)
        )
          break;
        if (W < maxAttempts) {
          let Y = Math.min(500 * 2 ** (W - 1), 30000) + Math.random() * 500;
          await sleep(Y, signal);
        }
        continue;
      }
      let z;
      if (x.status === 404 && w)
        try {
          let body = await x.json();
          if (typeof body?.error?.type === "string") z = body.error.type;
        } catch {}
      else if (x.status === 409) {
        if (e.isClosed?.()) return (await drainResponseBody(x), null);
        let K = await readConflictReason(x);
        if (e.isClosed?.()) return null;
        if (K === void 0 && signal?.aborted)
          return (
            logForDebugging(
              `CCRClient: GET ${n} returned 409 after its caller ended the read; its reason was not read, so the next request's 409 decides`,
              { level: "warn" },
            ),
            null
          );
        return (e.onConflict?.(K), null);
      } else await drainResponseBody(x);
      if (se(x.status) || z === "after_event_id_not_found" || permanentStatuses?.includes(x.status) === !0)
        return (
          logForDebugging(`CCRClient: GET ${n} returned ${x.status} \u2014 permanent, not retrying`, {
            level: "warn",
          }),
          w?.(x.status, z),
          null
        );
      if (
        (logForDebugging(`CCRClient: GET ${n} returned ${x.status} (attempt ${W}/${maxAttempts})`, {
          level: "warn",
        }),
        W < maxAttempts)
      ) {
        let K = Math.min(500 * 2 ** (W - 1), 30000) + Math.random() * 500;
        await sleep(K, signal);
      }
    }
    return (
      logForDebugging("CCRClient: GET retries exhausted", { level: "error" }),
      logForDiagnosticsNoPII("error", "cli_worker_get_retries_exhausted", { context: r }),
      null
    );
  }
  reportDelivery(e, n, s, r) {
    if (
      s !== void 0 &&
      this.flushPolicy?.holdAcrossModelCalls &&
      this.waitingAnswers.some(isTopLevelSystemInit)
    )
      this.sendWaitingAnswers();
    if (
      !this.housekeepingRequestIds.has(e) &&
      (n === "processing" || (n === "received" && !r?.controlTraffic))
    )
      ((this.turnTookInput = !0), (this.liveOnlyRequestingRow = void 0));
    if (n === "received") {
      this.lastInboundEventAtMs = Date.now();
      let O = r?.controlTraffic === !0 && this.flushPolicy?.controlTrafficKeepsHold === !0;
      if ((this.setHasSubscribers(void 0, O ? "reset" : "watcher"), this.holdsAcrossModelCalls() && !O)) {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        (this.internalEventUploader.release("event", "inbound_event"),
          this.releaseClientEvents("event", "inbound_event"));
      }
      if (s !== void 0) {
        ((this.holdsNoMoreThisTurn = !0), this.inboundMessageUuids.add(s));
        let C = this.inboundMessageUuids.values().next().value;
        if (this.inboundMessageUuids.size > Es && C !== void 0) this.inboundMessageUuids.delete(C);
      }
    }
    let h = n !== "received" && this.inboundMessageUuids.delete(e);
    if (n === "processing") {
      if (this.closed) return;
      if (h && this.receiptsMayRide()) this.messagesInProcessing.add(e);
      let O = this.pendingProcessingAcks.push(e) === 1;
      if (this.pickupTakesTick) return;
      if (h && this.holdsAcrossModelCalls() && this.turnHold !== "open")
        ((this.pickupTakesTick = !0),
          this.endWholeTurnHold(),
          this.ackPickupBehindWrittenRows().catch(logError));
      else if (O)
        queueMicrotask(() => {
          if (!this.pickupTakesTick) this.sendProcessingAcks(this.pendingProcessingAcks);
        });
      return;
    }
    let w = this.waitingReceipts.has(e),
      v =
        n === "processed" &&
        this.messagesInProcessing.delete(e) &&
        !this.closed &&
        this.receiptsMayRide() &&
        Vt(e) !== null &&
        (this.resultPostWaits !== void 0 || this.liveViewLaneSendsMore());
    if (this.messagesInProcessing.size === 0) this.resultPostWaits?.();
    let y =
      (v ||
        (n === "received" &&
          (r?.settingsRequest || (s !== void 0 && this.flushPolicy?.messagesReceivedWaits)))) &&
      !this.closed &&
      this.followsServedPolicy
        ? (this.flushPolicy?.settingsReceiptsMaxWaitMs ?? 0)
        : 0;
    if (!w && y <= 0) {
      this.queueDeliveryAcks([...this.takeWaitingReceipts(Ee), { eventId: e, status: n }]);
      return;
    }
    if (!w || n === "processed") this.waitingReceipts.set(e, n);
    if (v) this.receiptsRide ??= Promise.withResolvers();
    this.waitingReceiptsTimer ??= setTimeout(() => this.sendWaitingReceipts(), y);
  }
  receiptsMayRide() {
    return (
      this.flushPolicy?.receiptsRideUploads === !0 &&
      this.flushPolicy.settingsReceiptsMaxWaitMs > 0 &&
      !this.receiptsRideRefused &&
      this.followsServedPolicy
    );
  }
  takeWaitingReceipts(e = () => !0) {
    let mapped = [...this.waitingReceipts]
      .filter(([s, r]) => e(s, r))
      .map(([s, r]) => ({ eventId: s, status: r }));
    for (let { eventId: eventId } of mapped) this.waitingReceipts.delete(eventId);
    if (this.waitingReceipts.size === 0)
      (clearTimeout(this.waitingReceiptsTimer), (this.waitingReceiptsTimer = void 0));
    if (![...this.waitingReceipts.values()].includes("processed"))
      (this.receiptsRide?.resolve(), (this.receiptsRide = void 0));
    return mapped;
  }
  sendWaitingReceipts(e) {
    this.queueDeliveryAcks(this.takeWaitingReceipts(e));
  }
  queueDeliveryAcks(e) {
    let n = !this.deliveryUploader.hasRoomFor(e.length),
      enqueue = this.deliveryUploader.enqueue(e);
    if (n)
      (this.deliveryAcksWaitingForRoom.add(enqueue),
        enqueue.finally(() => this.deliveryAcksWaitingForRoom.delete(enqueue)));
  }
  async sendProcessingAcks(e) {
    let splice = e.splice(0);
    if (this.closed || splice.length === 0) return;
    let takeWaitingReceipts = this.takeWaitingReceipts(Ee);
    if (
      (
        await this.request(
          "post",
          "/worker/events/delivery",
          {
            worker_epoch: this.workerEpoch,
            updates: [
              ...splice.map((h) => ({ event_id: h, status: "processing" })),
              ...takeWaitingReceipts.map((h) => ({ event_id: h.eventId, status: h.status })),
            ],
          },
          "processing ack",
        )
      ).ok
    )
      this.takeWaitingReceipts((h, w) => w === "received" && splice.includes(h));
    else this.queueDeliveryAcks(takeWaitingReceipts);
  }
  async ackPickupBehindWrittenRows() {
    this.sendWaitingAnswers();
    let e = this.pickupBarriers.at(-1)?.opened.promise,
      n = { opened: Promise.withResolvers(), writes: [], eventIds: [] };
    this.pickupBarriers.push(n);
    let s;
    try {
      if (
        (await Promise.resolve(),
        (n.eventIds = this.pendingProcessingAcks.splice(0)),
        (this.pickupTakesTick = !1),
        await e,
        this.pickupBarriers.includes(n))
      )
        s = await withDeadline(this.storeWrittenRowsThenAck(n.eventIds), this.pickupWaitMs);
      else ((s = !0), await this.sendProcessingAcks(n.eventIds));
    } finally {
      let index = this.pickupBarriers.indexOf(n);
      this.openPickupBarriers(index < 0 || s ? index + 1 : this.pickupBarriers.length);
    }
  }
  async storeWrittenRowsThenAck(e) {
    return (
      this.internalEventUploader.release("event", "pickup"),
      await this.flush(),
      await this.sendProcessingAcks(e),
      !0
    );
  }
  openPickupBarriers(e) {
    for (let n of this.pickupBarriers.splice(0, e)) {
      this.sendProcessingAcks(n.eventIds).catch(logError);
      for (let { messages: messages, opts: opts, written: written } of n.writes)
        this.writeEventsNow(messages, opts).then(written.resolve, written.reject);
      n.opened.resolve();
    }
  }
  getWorkerEpoch() {
    return this.workerEpoch;
  }
  get internalEventsPending() {
    return (
      this.internalEventUploader.pendingCount +
      this.countRowsAwaitingCompactSummary() +
      (this.rowsAwaitingCompactSummaryAtClose ?? 0)
    );
  }
  uploadHoldInAll() {
    let flushPolicy = this.flushPolicy;
    return flushPolicy !== void 0 && this.servedPolicyHolds()
      ? {
          holdsAcrossModelCalls: flushPolicy.holdAcrossModelCalls,
          maxAgeMs: flushPolicy.maxAgeMs,
          maxEvents: flushPolicy.maxEvents,
          counts: this.uploadHoldTally.counts,
        }
      : void 0;
  }
  uploadLaneCounts() {
    return {
      clientEventsPending: this.eventUploader.pendingCount,
      droppedDurableBatches: this.droppedDurableEventBatches,
      undeliveredClientEventsAtClose: this.undeliveredClientEventsAtClose,
      undeliveredInternalEventsAtClose: this.undeliveredInternalEventsAtClose,
      clientEventsAfterClose: this.eventUploader.handedOverAfterCloseCount,
      internalEventsAfterClose: this.internalEventUploader.handedOverAfterCloseCount,
    };
  }
  countRowsAwaitingCompactSummary() {
    let e = 0;
    for (let n of this.rowsAwaitingCompactSummary.values()) e += n.rows.length;
    return e;
  }
  get awaitsCompactSummary() {
    return this.rowsAwaitingCompactSummary.has("");
  }
  hasInternalEventRoom(e) {
    return !this.awaitsCompactSummary && this.internalEventUploader.hasRoomFor(e);
  }
  close(e) {
    this.closeExceptInternalEvents(e);
    let countRowsAwaitingCompactSummary = this.countRowsAwaitingCompactSummary();
    for (let s of this.rowsAwaitingCompactSummary.keys()) this.takeRowsAwaitingCompactSummary(s, "close");
    ((this.rowsAwaitingCompactSummaryAtClose ??= countRowsAwaitingCompactSummary),
      this.logUndeliveredAtClose(
        "internal_events",
        this.internalEventUploader.close() + countRowsAwaitingCompactSummary,
      ));
  }
  flushGoodbye() {
    return this.goodbyeFlushed;
  }
  closeExceptInternalEvents(e) {
    (this.sendWaitingAnswers(), this.openPickupBarriers(this.pickupBarriers.length));
    let closed = this.closed;
    ((this.closed = !0),
      this.giveBackRidingRows(),
      this.workerSocket?.usePostFromNowOn(),
      this.closeAbort.abort(),
      (this.closingForSuccessor = e?.retainUndeliveredClientEvents === !0));
    let takeParkedRows = this.takeParkedRows();
    if (takeParkedRows.length > 0) this.eventUploader.enqueue(takeParkedRows);
    if (e?.keepWaitingWorkerMetadata === !0) this.workerState.closeToNewPatches();
    else this.workerState.close();
    if (!closed && e?.goodbye !== !1) this.sendGoodbye();
    if ((this.stopHeartbeat(), this.clearProbeBeatTimer(), this.viewerCheckpointTimer))
      (clearTimeout(this.viewerCheckpointTimer), (this.viewerCheckpointTimer = null));
    (this.unsubscribeIdleTracker?.(),
      clearActivityCallback(),
      this.stopWorkStartKeepAlive?.(),
      this.stopToolCallGate?.());
    for (let r of this.toolCallRowWaiters.values()) for (let h of r) h.reached();
    if ((this.toolCallRowWaiters.clear(), this.streamEventTimer))
      (clearTimeout(this.streamEventTimer), (this.streamEventTimer = null));
    if (this.firstDeltaFlushTimer)
      (clearTimeout(this.firstDeltaFlushTimer), (this.firstDeltaFlushTimer = null));
    if (((this.streamEventBuffer = []), (this.pendingProcessingAcks = []), this.receiptsRide))
      this.sendWaitingReceipts(Ee);
    if ((clearTimeout(this.waitingReceiptsTimer), e?.keepClientEvents !== !0))
      this.logUndeliveredAtClose(
        "client_events",
        this.eventUploader.close({ retainUndelivered: e?.retainUndeliveredClientEvents === !0 }),
      );
    this.deliveryUploader.close();
  }
  registerShutdownCleanup(
    e = { registerCleanup: registerCleanup, registerPreExitFlush: registerPreExitFlush },
    n = CCR_RETRY_DELAY_MS,
  ) {
    (e.registerCleanup(() => this.beginShutdown()), e.registerPreExitFlush(() => this.finishShutdown(n)));
  }
  beginShutdown() {
    ((this.shutdownBeganAtMs = performance.now()),
      (this.owedMetadataDropsAtShutdown = this.droppedOwedMetadataPatchCount),
      this.sendWaitingReceipts());
    try {
      let e = !this.closed && this.currentState === "running" && this.followsServedPolicy;
      if (
        ((this.shutdownKeepsClientEvents = e || (!this.closed && this.servedPolicyHolds())),
        this.shutdownKeepsClientEvents)
      )
        ((this.shutdownReleased = !0), this.applyUploadHold("shutdown"));
    } finally {
      this.closeExceptInternalEvents({
        keepClientEvents: this.shutdownKeepsClientEvents,
        keepWaitingWorkerMetadata: !0,
      });
    }
  }
  async finishShutdown(e = CCR_RETRY_DELAY_MS, n = 1 / 0) {
    let startTime = performance.now();
    await this.flushGoodbye();
    let owesMetadata = this.workerState.owesMetadata;
    try {
      await withDeadline(
        Promise.allSettled([
          this.flushEventLanesAtShutdown(),
          owesMetadata
            ? withDeadline(
                this.flushWorkerState().then(() => this.flushEventLanesAtShutdown()),
                Math.max(
                  0,
                  Math.min(
                    e - (performance.now() - this.shutdownBeganAtMs),
                    n - (performance.now() - startTime),
                  ),
                ),
              )
            : void 0,
        ]),
        e,
      );
    } finally {
      let h = this.droppedOwedMetadataPatchCount > this.owedMetadataDropsAtShutdown;
      if (owesMetadata || this.workerState.hasCutKeptMetadata || h)
        logForDiagnosticsNoPII("info", "cli_worker_metadata_at_shutdown", {
          outcome: this.workerState.owesMetadata
            ? "timed_out"
            : this.workerState.hasCutKeptMetadata
              ? "cut"
              : h
                ? "refused"
                : "drained",
        });
      (this.close(), this.onInternalEventLaneClosed?.(), await flushDiagnosticLogs().catch(() => {}));
    }
  }
  flushEventLanesAtShutdown() {
    return Promise.allSettled([
      this.flushInternalEvents(),
      this.shutdownKeepsClientEvents ? this.flush() : void 0,
    ]);
  }
}
//@ chunk-fp6aqx1j.js:134287-134299 layout
var CCR_RETRY_DELAY_MS = 3000;
//@ chunk-fp6aqx1j.js:134299-134457 layout
function blockedToNeedInput(e) {
  let post_turn_summary = e.post_turn_summary;
  if (!hasStatusCategory(post_turn_summary) || post_turn_summary.status_category !== "blocked") return e;
  return { ...e, post_turn_summary: { ...post_turn_summary, status_category: "need_input" } };
}
//@ chunk-fp6aqx1j.js:134457-134569 layout
function hasStatusCategory(e) {
  return (
    e !== null && typeof e === "object" && "status_category" in e && typeof e.status_category === "string"
  );
}
//@ chunk-fp6aqx1j.js:134569-134772 layout
async function readConflictReason(e) {
  let n = asConflictReason(e.headers.get("x-ccr-conflict-reason"));
  if (n !== void 0) return (await drainResponseBody(e), n);
  try {
    let body = await e.json();
    return asConflictReason(body?.error?.reason ?? body?.reason) ?? asConflictReason(body?.error?.type);
  } catch {}
  return;
}
//@ chunk-fp6aqx1j.js:134772-134892 layout
function asConflictReason(e) {
  switch (e) {
    case "superseded_by_worker":
    case "epoch_stale":
    case "session_not_active":
      return e;
    default:
      return;
  }
}
//@ chunk-fp6aqx1j.js:134892-137300 layout
function parseHoldPolicy(e) {
  let safeParse = WorkerLimitsSchema().safeParse(e);
  if (!safeParse.success) return;
  let s = safeParse.data,
    r = s.hold_across_model_calls === !0,
    h = clampNonNegativeInt(s.max_age_ms, r ? ve : Kt),
    w = h > 0 ? clampNonNegativeInt(s.max_events, r ? bs : Ss) : 0,
    v = clampNonNegativeInt(s.max_bytes, As),
    y = r ? 0 : clampNonNegativeInt(s.transcript_max_age_ms, Yt),
    O = y > h ? y : 0,
    C = clampNonNegativeInt(s.no_turn_max_age_ms, h),
    U = s.policy_version ?? void 0;
  return {
    maxEvents: w,
    maxAgeMs: h,
    maxBytes: v > 0 ? v : void 0,
    flushOnSamplingEnd: s.flush_on_sampling_end === !0 && !r,
    flushOnAssistant: s.flush_on_assistant === !0,
    eventBatchUpload: s.event_batch_upload === !0,
    holdAcrossModelCalls: r,
    holdAgain:
      r && s.hold_again
        ? {
            softAgeMs: clampNonNegativeInt(s.hold_again.soft_age_ms, h),
            softEvents: clampNonNegativeInt(s.hold_again.soft_events, w),
            after: new Set((s.hold_again.after ?? []).slice(0, Et)),
            neverAfterTools: new Set((s.hold_again.never_after_tools ?? []).slice(0, He)),
            toolsWhoseResultsWait: s.hold_again.tools_whose_results_wait
              ? new Set(s.hold_again.tools_whose_results_wait.slice(0, He))
              : void 0,
            laterWorkerHoldsFirstTurn:
              s.hold_again.later_worker_holds_first_turn === !0 &&
              s.live_twin_types?.includes("system/status") === !0,
          }
        : void 0,
    mayWaitTypes: new Set((s.may_wait_types ?? []).filter((S) => Tt.has(S))),
    mayWaitTypesRefused: count(s.may_wait_types ?? [], (S) => !Tt.has(S)),
    settingsReceiptsMaxWaitMs: clampNonNegativeInt(s.settings_receipts_max_wait_ms, Os),
    messagesReceivedWaits: s.messages_received_waits === !0,
    receiptsRideUploads: s.receipts_ride_uploads === !0,
    flushBeforeToolsWaitMs: clampNonNegativeInt(s.flush_before_tools_wait_ms, qs),
    flushAfterTools: js.find((S) => S === s.flush_after_tools) ?? "none",
    flushAfterToolNames: new Set((s.flush_after_tool_names ?? []).slice(0, He)),
    mustFlushTypes: new Set((s.must_flush_types ?? []).slice(0, Et)),
    liveTwinTypes: new Set((s.live_twin_types ?? []).filter((S) => !S.startsWith("control_")).slice(0, Ws)),
    liveOnlyTypes: new Set((s.live_only_types ?? []).filter((S) => Us.has(S))),
    transcriptMaxAgeMs: O,
    noTurnMaxAgeMs: C < h ? C : 0,
    mergeWorkerReports: s.merge_worker_reports === !0,
    controlTrafficKeepsHold: r && s.control_traffic_keeps_hold === !0,
    emptyCheckpointKeepsHold: r && s.empty_checkpoint_keeps_hold === !0,
    firstTurnHoldsEachCall: r && s.first_turn_holds_each_call === !0,
    settingsAnswersMaxWaitMs: clampNonNegativeInt(
      s.settings_answers_max_wait_ms,
      DEFAULT_SETTINGS_ANSWER_WAIT_MS,
    ),
    initMaxWaitMs: clampNonNegativeInt(s.init_max_wait_ms, DEFAULT_SETTINGS_ANSWER_WAIT_MS),
    metadataWaitsForStatus: new Set((s.metadata_waits_for_status ?? []).filter((S) => Bs.has(S))),
    metadataNeverSent: new Set((s.metadata_never_sent ?? []).filter((S) => en.has(S))),
    metadataMaxWaitMs: clampNonNegativeInt(s.metadata_max_wait_ms, ve),
    costReportMaxWaitMs: clampNonNegativeInt(s.cost_report_max_wait_ms, Hs),
    policyVersion: U !== void 0 && Ls.test(U) ? U : void 0,
  };
}
//@ chunk-fp6aqx1j.js:137300-137376 layout
function normalizePayload(e) {
  let n = normalizeUserToolUseResult(e.payload);
  return n === e.payload ? e : { ...e, payload: n };
}
//@ chunk-fp6aqx1j.js:137376-137544 layout
function hasUserMessageUuids(e) {
  return (
    "user_message_uuids" in e &&
    Array.isArray(e.user_message_uuids) &&
    e.user_message_uuids.length > 0 &&
    e.user_message_uuids.every((user_message_uuid) => typeof user_message_uuid === "string")
  );
}
//@ chunk-fp6aqx1j.js:137544-137672 layout
function isTopLevelSystemInit(e) {
  return (
    e.type === "system" &&
    "subtype" in e &&
    e.subtype === "init" &&
    !("parent_tool_use_id" in e && e.parent_tool_use_id)
  );
}
//@ chunk-fp6aqx1j.js:137672-137740 placement
var ar = new Set(["assistant", "attachment", "result", "system", "user"]);
//@ chunk-fp6aqx1j.js:137740-137913 placement
function describeSingleRowForTelemetry(e) {
  let n = e.length === 1 ? e[0].payload : void 0;
  return (
    n && {
      row_type: ar.has(n.type) ? n.type : "other",
      row_has_tool_result: hasToolResultContent(n.message),
      row_bytes: Buffer.byteLength(jsonStringify(n)),
    }
  );
}
/**
 * 把一条 SDK 行归类为遥测用的 type/subtype 字符串；前台 shell 任务开始与 rate_limit_event（带 grace/overage 后缀）有专门分类。
 */
//@ chunk-fp6aqx1j.js:137913-138447 placement
function classifyRowTypeForTelemetry(message) {
  if (
    message.type === "system" &&
    message.subtype === "task_started" &&
    message.task_type === "local_bash" &&
    message.is_backgrounded === !1 &&
    !("owned_by_subagent" in message && message.owned_by_subagent)
  )
    return "system/task_started_foreground_shell";
  if (message.type === "rate_limit_event") {
    let rate_limit_info = message.rate_limit_info;
    if (!isPlainObject(rate_limit_info) || typeof rate_limit_info.status !== "string") return message.type;
    let s =
      rate_limit_info.rateLimitGraceActive === !0
        ? "_grace"
        : rate_limit_info.overageInUse === !0 || rate_limit_info.isUsingOverage === !0
          ? "_overage"
          : "";
    return `${message.type}/${rate_limit_info.status}${s}`;
  }
  return "subtype" in message && typeof message.subtype === "string"
    ? `${message.type}/${message.subtype}`
    : message.type;
}
//@ chunk-fp6aqx1j.js:138447-138557 placement
function hasToolResultContent(e) {
  let n = isPlainObject(e) ? e.content : void 0;
  return Array.isArray(n) && n.some((s) => isPlainObject(s) && s.type === "tool_result");
}
//@ chunk-fp6aqx1j.js:138557-138595 placement
var lr = new Set(["ReadNotifications"]);
//@ chunk-fp6aqx1j.js:138595-138709 placement
function getMainThreadToolUseIds(e, n) {
  return isPlainObject(e) && e.type === "assistant" && e.parent_tool_use_id == null
    ? collectContentBlockField(e.message, "tool_use", "id", n)
    : [];
}
//@ chunk-fp6aqx1j.js:138709-138941 placement
function collectContentBlockField(e, n, s, r) {
  let h = isPlainObject(e) ? e.content : void 0;
  if (!Array.isArray(h)) return [];
  let w = [];
  for (let v of h)
    if (isPlainObject(v) && v.type === n && (r === void 0 || (typeof v.name === "string" && r.has(v.name)))) {
      let y = v[s];
      if (typeof y === "string") w.push(y);
    }
  return w;
}
//@ chunk-fp6aqx1j.js:138941-139051 placement = createChildAbortController (0.879)
function createChildAbortController(e) {
  return new Promise((n) => {
    if (e.aborted) n();
    else e.addEventListener("abort", () => n(), { once: !0 });
  });
}
//@ chunk-fp6aqx1j.js:139051-139135 placement
function ce(e) {
  if (e.size > zs) {
    let n = e.keys().next().value;
    if (n !== void 0) e.delete(n);
  }
}
//@ chunk-fp6aqx1j.js:139135-139239 placement
function clampNonNegativeInt(e, n) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(0, Math.trunc(e)), n) : 0;
}
//@ chunk-fp6aqx1j.js:139239-141177 placement
function summarizeAssistantMessage(e, n) {
  if (!e || !n) return e === n;
  return (
    e.maxEvents === n.maxEvents &&
    e.maxAgeMs === n.maxAgeMs &&
    e.maxBytes === n.maxBytes &&
    e.flushOnSamplingEnd === n.flushOnSamplingEnd &&
    e.flushOnAssistant === n.flushOnAssistant &&
    e.eventBatchUpload === n.eventBatchUpload &&
    e.holdAcrossModelCalls === n.holdAcrossModelCalls &&
    e.holdAgain?.softAgeMs === n.holdAgain?.softAgeMs &&
    e.holdAgain?.softEvents === n.holdAgain?.softEvents &&
    setsEqual(e.holdAgain?.after, n.holdAgain?.after) &&
    setsEqual(e.holdAgain?.neverAfterTools, n.holdAgain?.neverAfterTools) &&
    setsEqual(e.holdAgain?.toolsWhoseResultsWait, n.holdAgain?.toolsWhoseResultsWait) &&
    e.holdAgain?.laterWorkerHoldsFirstTurn === n.holdAgain?.laterWorkerHoldsFirstTurn &&
    setsEqual(e.mayWaitTypes, n.mayWaitTypes) &&
    setsEqual(e.liveOnlyTypes, n.liveOnlyTypes) &&
    setsEqual(e.flushAfterToolNames, n.flushAfterToolNames) &&
    e.settingsReceiptsMaxWaitMs === n.settingsReceiptsMaxWaitMs &&
    e.messagesReceivedWaits === n.messagesReceivedWaits &&
    e.receiptsRideUploads === n.receiptsRideUploads &&
    e.flushBeforeToolsWaitMs === n.flushBeforeToolsWaitMs &&
    e.flushAfterTools === n.flushAfterTools &&
    e.mergeWorkerReports === n.mergeWorkerReports &&
    e.transcriptMaxAgeMs === n.transcriptMaxAgeMs &&
    e.noTurnMaxAgeMs === n.noTurnMaxAgeMs &&
    e.controlTrafficKeepsHold === n.controlTrafficKeepsHold &&
    e.emptyCheckpointKeepsHold === n.emptyCheckpointKeepsHold &&
    e.firstTurnHoldsEachCall === n.firstTurnHoldsEachCall &&
    e.settingsAnswersMaxWaitMs === n.settingsAnswersMaxWaitMs &&
    e.initMaxWaitMs === n.initMaxWaitMs &&
    e.policyVersion === n.policyVersion &&
    e.mustFlushTypes.size === n.mustFlushTypes.size &&
    [...e.mustFlushTypes].every((s) => n.mustFlushTypes.has(s)) &&
    e.liveTwinTypes.size === n.liveTwinTypes.size &&
    [...e.liveTwinTypes].every((s) => n.liveTwinTypes.has(s)) &&
    e.metadataMaxWaitMs === n.metadataMaxWaitMs &&
    e.costReportMaxWaitMs === n.costReportMaxWaitMs &&
    e.metadataWaitsForStatus.size === n.metadataWaitsForStatus.size &&
    [...e.metadataWaitsForStatus].every((s) => n.metadataWaitsForStatus.has(s)) &&
    setsEqual(e.metadataNeverSent, n.metadataNeverSent)
  );
}
//@ chunk-fp6aqx1j.js:141177-141418 placement
function parseFlushIntervalMs(e, n, s) {
  let r = typeof n === "string" ? Number(n) : n;
  if (typeof r === "number" && Number.isFinite(r)) return Math.min(Math.max(r, 0), 60000);
  if (n !== void 0)
    logForDebugging(`CCRClient: non-finite ${e} (${typeof n}) \u2014 using ${s}ms`, { level: "warn" });
  return s;
}
//@ chunk-fp6aqx1j.js:141418-141504 placement
function Ut(e) {
  return e.type === "system" && "subtype" in e && e.subtype === "thinking_tokens";
}
/**
 * 判断一条 SDK 消息是否属于实时/进度类（user、stream_event、tool_progress、不含 SendUserMessage/PushNotification 的 assistant、thinking_tokens/task_progress/hook_progress 系统消息），决定 CCRClient 的保留与刷写策略。
 */
//@ chunk-fp6aqx1j.js:141504-141867 placement
function isEphemeralStreamMessage(e) {
  switch (e.type) {
    case "user":
    case "stream_event":
    case "tool_progress":
      return !0;
    case "assistant":
      return !e.message.content.some(
        (n) => n.type === "tool_use" && (n.name === "SendUserMessage" || n.name === "PushNotification"),
      );
    case "system":
      return (
        "subtype" in e &&
        (e.subtype === "thinking_tokens" || e.subtype === "task_progress" || e.subtype === "hook_progress")
      );
    default:
      return !1;
  }
}
//@ chunk-fp6aqx1j.js:141867-141925 placement
function Wt(e) {
  if (e) return "?include_hearth=true";
  return "";
}
//@ chunk-fp6aqx1j.js:141925-141957 placement
function Bt(e) {
  return e?.hearth;
}
//@ chunk-fp6aqx1j.js:141957-142022 placement
function Ht(e, n) {
  return e.historical === !0 && n.has(e.payload.uuid);
}
//@ chunk-fp6aqx1j.js:142022-142068 placement
function Xe(e) {
  return e.payload.type === "user";
}
/**
 * 创建空闲跟踪器：noteActivity 记录活动并通知订阅者，sampleIdleSeconds 在回合运行时返回 0，否则返回距上次活动的秒数；用于 CCR 心跳的 idle 上报。
 */
//@ chunk-fp6aqx1j.js:142068-142330 placement
function createIdleTracker(e) {
  let n = e?.isTurnRunning ?? (() => getMainLoopRefcount() > 0),
    s = createSignal(),
    now = Date.now();
  return {
    noteActivity() {
      now = Date.now();
      try {
        s.emit();
      } catch (error) {
        logError(error);
      }
    },
    sampleIdleSeconds() {
      let now_2 = Date.now();
      if (n()) return ((now = now_2), 0);
      return Math.max(0, Math.floor((now_2 - now) / 1000));
    },
    onActivity: s.subscribe,
  };
}
/**
 * 构造一条 replay 用户消息（isReplay）。
 */
//@ chunk-3wek6r2k.js:29172-29300 fingerprint = scopeKey (0.642)
function scopeKey(e, o, n) {
  return {
    type: "user",
    uuid: o,
    session_id: e,
    isReplay: !0,
    parent_tool_use_id: null,
    message: { role: "user", content: n },
  };
}

export {
  SETTINGS_CONTROL_SUBTYPES,
  isEphemeralStreamMessage,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  createIdleTracker,
  L1t,
  scopeKey,
  CCRClient,
  WORKER_CONFLICT_CLOSE_CODES,
  Xe,
  findLastRowBeforeSpans,
  selectRowsToResend,
  fUr,
  CCRInitError,
  kKs,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  NNo,
  TENGU_PATIENT_LEDGER,
};
