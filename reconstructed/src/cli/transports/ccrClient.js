/**
 * cli/transports/ccrClient.ts
 *
 * CCR（云会话）worker 客户端：事件批量上传、状态、心跳、投递确认与流事件处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/ccrClient.ts
 * pieces: chunk-3wek6r2k.js (1), chunk-fp6aqx1j.js (91)
 * attribution: fingerprint 3, placement 73, layout 11, affinity 4, callgraph-witnessed 1
 */
import { randomUUID } from "crypto";
import { count, setsEqual, uniq } from "../../utils/collections.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_FRAME_BYTES, findCoalescedRunHead, coalesceStreamEvents } from "./streamEventCoalescing.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isKnownContentBlockType } from "../../services/api/requestHeaders.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../../services/remoteTools/remoteToolsDebug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  u,
  string,
  looseObject,
  record,
  unknown,
  M,
  array,
  literal,
  E,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { requestIdOf, notifySessionStateChanged } from "../../utils/sessionState.js";
import { buildRequiresActionDetails } from "../structuredIO.js";
import { env } from "../../utils/env.js";
import { getSessionIngressAuthHeaders, getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { convertWsUrlToPostUrl } from "./HybridTransport.js";
import { WorkerStateUploader } from "./WorkerStateUploader.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { logForDiagnosticsNoPII, flushDiagnosticLogs } from "../../utils/diagLogs.js";
import {
  ClientEventUploader,
  ClientEventUploadError,
  ClientEventBatchRejectedError,
  ClientEventResendSoonError,
  ClientEventTooSmallError,
} from "../../utils/telemetry/memorySummary.js";
import { dedupeEventsByUuid } from "../../utils/teleport/api.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  isAssistantWithMessageId,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  normalizeUserToolUseResult,
} from "./ccrMessageMapping.js";
import { isRelayableControlFrame } from "../../remote/RemoteSessionManager.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  setActivityCallback,
  onWorkStarted,
  hasActiveWork,
  clearActivityCallback,
  getMainLoopRefcount,
} from "../../utils/sessionActivity.js";
import { logError } from "../../utils/log.js";
import { setBridgeSessionListener } from "../../bridge/createSession.js";
import { recordPhase } from "../../utils/startupTiming.js";
import { proxyAwareFetch } from "../../upstreamproxy/proxyFetch.js";
import { getClientPlatform, claudeCodeUserAgent, drainResponseBody } from "../../utils/http.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { readRequestIdSource, isNonOriginSource } from "../../services/api/requestIdSource.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { isHearthDegraded } from "../../services/mcp/hearthDegraded.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { capLiveOnlyResponseSize, isLiveOnlyResponse } from "../../bridge/controlRequests.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { chunk_default } from "../../../vendor/lodash-es/chunk.js";
import { isClassifierDumpEvent } from "../../utils/teleport/autoModeDumps.js";
import { registerCleanup, registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-fp6aqx1j.js:1962-2061 placement
var CCR_TICKET_HEADER_NAMES = ["x-ccr-ticket-rev", "x-ccr-ticket-session", "x-ccr-ticket-seq"];
var TICKET_VALUE_PATTERN = /^[A-Za-z0-9_-]{1,4096}$/;
//@ chunk-fp6aqx1j.js:2061-2498 placement
class TicketHeaders {
  authorization;
  held = new Map();
  headersFor(e) {
    if (e === undefined) return {};
    if (e !== this.authorization) {
      this.held.clear();
      this.authorization = e;
    }
    return Object.fromEntries(this.held);
  }
  note(e, n) {
    if (e === undefined || e !== this.authorization) return;
    if (n.redirected || (n.status >= 400 && n.status < 500 && n.status !== 429)) {
      this.held.clear();
      return;
    }
    for (let s of CCR_TICKET_HEADER_NAMES) {
      let r = n.headers.get(s);
      if (r === "") this.held.delete(s);
      else if (r !== null && TICKET_VALUE_PATTERN.test(r)) this.held.set(s, r);
    }
  }
}
//@ chunk-fp6aqx1j.js:2498-2508 placement
var MAX_REMEMBERED_ATTEMPTS = 64;
//@ chunk-fp6aqx1j.js:2508-3134 placement
class UploadBacklogStats {
  rowsAhead;
  queuedSince = new WeakSet();
  attempts = [];
  posts = 0;
  failedPosts = 0;
  rows = 0;
  constructor(rowsAhead) {
    this.rowsAhead = rowsAhead;
  }
  noteQueued(e) {
    for (let n of e) this.queuedSince.add(n);
  }
  noteAttempt(e, startedAt, s) {
    let r = count(e, (h) => this.queuedSince.has(h));
    this.posts++;
    if (s) this.rows += r;
    else this.failedPosts++;
    if (this.attempts.length < MAX_REMEMBERED_ATTEMPTS)
      this.attempts.push({
        startedAt,
        endedAt: performance.now(),
        ahead: r === 0,
      });
  }
  seen(e) {
    let aheadMs = 0;
    let postMs = 0;
    for (let { startedAt, endedAt, ahead } of this.attempts) {
      let max = Math.max(0, endedAt - Math.max(startedAt, e));
      if (ahead) aheadMs += max;
      else postMs += max;
    }
    return {
      aheadMs,
      postMs,
      posts: this.posts,
      failedPosts: this.failedPosts,
      rowsAhead: this.rowsAhead,
      rows: this.rows,
    };
  }
}
//@ chunk-fp6aqx1j.js:3134-3147 placement
/**
 * 压缩边界 preservedMessages.uuids 最多保留 1536 个，超出截尾并同步裁剪 allUuids 与 headUuid。
 */
var MAX_PRESERVED_MESSAGE_UUIDS = 1536;
//@ chunk-fp6aqx1j.js:3147-3221 placement
function isStringArray(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-fp6aqx1j.js:3221-3630 placement
/**
 * 压缩后的 boundary 行如果 preservedMessages.uuids 过多，只保留最后 n 个并同步裁剪 allUuids 与 preservedSegment.headUuid。
 */
function trimPreservedMessagesMetadata(e, n = MAX_PRESERVED_MESSAGE_UUIDS) {
  let compactMetadata = e.compactMetadata;
  if (!isPlainObject(compactMetadata)) return null;
  let preservedMessages = compactMetadata.preservedMessages;
  if (!isPlainObject(preservedMessages)) return null;
  let uuids = preservedMessages.uuids;
  if (!isStringArray(uuids) || uuids.length <= n) return null;
  let sliced = uuids.slice(-n);
  let v = sliced[0];
  let allUuids = preservedMessages.allUuids;
  let O = isStringArray(allUuids) ? allUuids.indexOf(v) : -1;
  let preservedSegment = compactMetadata.preservedSegment;
  return {
    ...e,
    compactMetadata: {
      ...compactMetadata,
      preservedMessages: {
        ...preservedMessages,
        uuids: sliced,
        ...(isStringArray(allUuids) && {
          allUuids: O >= 0 ? allUuids.slice(O) : allUuids.slice(-n),
        }),
      },
      ...(isPlainObject(preservedSegment) && {
        preservedSegment: {
          ...preservedSegment,
          headUuid: v,
        },
      }),
    },
  };
}
//@ chunk-fp6aqx1j.js:3630-3693 placement
/**
 * 持久上传账本限额：重试次数小于 10 优先重发、未应答超过 1 万条清空停写、行龄与行字节上限。
 */
var TENGU_PATIENT_LEDGER = "tengu_patient_ledger";
var MAX_LEDGER_RETRIES = 10;
var MAX_UNANSWERED_ROWS = 1e4;
var MAX_ROW_AGE_MS = 400;
var MAX_ROW_BYTES = 2097152;
//@ chunk-fp6aqx1j.js:3693-3796 placement
function isIsoTimestamp(e) {
  return typeof e === "string" && /^\d{4}-\d{2}-\d{2}T/.test(e) && !Number.isNaN(Date.parse(e));
}
//@ chunk-fp6aqx1j.js:3796-4060 placement
function parseClientRowsOwedSpans(clientRowsOwed) {
  if (!isPlainObject(clientRowsOwed) || clientRowsOwed.v !== 1 || !Array.isArray(clientRowsOwed.spans))
    return [];
  return clientRowsOwed.spans.flatMap((span) =>
    isPlainObject(span) && isIsoTimestamp(span.since)
      ? [
          {
            since: span.since,
            ...(typeof span.until === "string" &&
              span.until !== "" && {
                until: span.until,
              }),
            tries: Number.isInteger(span.tries) && Number(span.tries) > 0 ? Number(span.tries) : 0,
          },
        ]
      : [],
  );
}
//@ chunk-fp6aqx1j.js:4060-6802 placement
/**
 * 记录本轮已发送/重发的消息与未应答项，用于恢复时补发（tengu_patient_ledger）。
 */
class TurnLedger {
  earlier = [];
  sentAgain = new Set();
  own = undefined;
  unanswered = new Set();
  writes = false;
  refused = false;
  runOpen = false;
  startedAt = "";
  runOpenedAt = "";
  guardLapsed = false;
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
    if (e.readFailed === true) return;
    this.writes = true;
    this.startedAt = n.toISOString();
    this.stampsCountFrom = n.getTime();
    this.runOpenedAt = this.startedAt;
    let clientRowsOwedSpans = parseClientRowsOwedSpans(e.internal?.client_rows_owed);
    this.earlier = clientRowsOwedSpans.filter(
      (clientRowsOwedSpan) => clientRowsOwedSpan.tries < MAX_LEDGER_RETRIES,
    );
    this.spansGivenUpAtStart = clientRowsOwedSpans.length - this.earlier.length;
  }
  stateReported(e, n, s) {
    if (this.runOpen === (e === "idle")) {
      this.runOpen = !this.runOpen;
      this.runOpenedAt = this.runOpen ? n.toISOString() : this.runOpenedAt;
    }
    if (!s) return this.guardEnded(n);
    return (
      (this.runOpen ? this.openOwnSpan(n) : this.rowsAnswered([])) ??
      (this.writes && (this.own !== undefined || this.earlier.length > 0) ? this.note() : undefined)
    );
  }
  rowsEntered(e, n) {
    let filtered = e.filter((h) => getMainThreadTurnUuid(h) !== undefined);
    for (let h of filtered) this.unanswered.add(String(h.uuid));
    if (this.unanswered.size > MAX_UNANSWERED_ROWS) {
      this.unanswered.clear();
      this.writes = false;
    }
    if (filtered.length === 0) return;
    let min = Math.min(
      n.getTime(),
      ...filtered
        .flatMap((h) => (isIsoTimestamp(h.timestamp) ? [Date.parse(h.timestamp)] : []))
        .filter((h) => h >= this.stampsCountFrom),
    );
    if (this.own === undefined) return this.openOwnSpan(new Date(min));
    if (!this.writes || min >= Date.parse(this.own.since)) return;
    this.own = {
      ...this.own,
      since: new Date(min).toISOString(),
    };
    return this.note();
  }
  rowsAnswered(e) {
    let n = this.sentAgain.size > 0;
    for (let h of e) {
      this.unanswered.delete(h);
      this.sentAgain.delete(h);
    }
    let s = n && this.sentAgain.size === 0;
    let r = this.own !== undefined && !this.runOpen && this.unanswered.size === 0;
    if (!this.writes || (!s && !r)) return;
    this.earlier = s ? [] : this.earlier;
    this.own = r ? undefined : this.own;
    return this.note();
  }
  guardEnded(e) {
    this.guardLapsed = true;
    this.stampsCountFrom = e.getTime();
    this.unanswered.clear();
    if (!this.writes || this.own === undefined) return;
    this.own = undefined;
    return this.note();
  }
  earlierSpansTried(e) {
    return this.replaceEarlier(
      this.earlier.map((n) => ({
        ...n,
        until: n.until ?? e ?? this.startedAt,
        tries: n.tries + 1,
      })),
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
    this.writes = false;
    this.refused = true;
  }
  replaceEarlier(earlier) {
    if (!this.writes || this.earlier.length === 0) return;
    this.earlier = earlier;
    return this.note();
  }
  openOwnSpan(e) {
    if (!this.writes || this.own !== undefined) return;
    this.own = {
      since: this.guardLapsed
        ? e.toISOString()
        : new Date(Math.max(Date.parse(this.runOpenedAt), this.stampsCountFrom)).toISOString(),
      tries: 0,
    };
    this.guardLapsed = false;
    return this.note();
  }
  note() {
    let mapped = this.earlier.map((s) => ({
      ...s,
      until: s.until ?? this.startedAt,
    }));
    let n = this.own ? [...mapped, this.own] : mapped;
    return {
      client_rows_owed:
        n.length > 0
          ? {
              v: 1,
              spans: n,
            }
          : null,
    };
  }
}
//@ chunk-fp6aqx1j.js:6802-7052 placement
function getMainThreadTurnUuid(e) {
  let content = isPlainObject(e.message) ? e.message.content : undefined;
  return typeof e.uuid === "string" &&
    Array.isArray(content) &&
    e.isSidechain !== true &&
    !e.parent_tool_use_id &&
    (e.type === "assistant" ||
      (e.type === "user" && content.some((s) => isPlainObject(s) && s.type === "tool_result")))
    ? e.uuid
    : undefined;
}
//@ chunk-fp6aqx1j.js:7052-7911 placement
function selectRowsToResend(e, n, s = () => true) {
  let r = "nothing";
  let flattened = e.flatMap(({ since, until }) => {
    let index = n.findIndex(isAtOrAfterTimestamp(since));
    let C = index < 0 ? [] : n.slice(index);
    let U =
      until === undefined
        ? -1
        : isIsoTimestamp(until)
          ? C.findIndex(isAtOrAfterTimestamp(until))
          : C.findIndex((W) => W.uuid === until) + 1;
    let S = U < 0 ? C : C.slice(0, U);
    if (
      (until !== undefined && !isIsoTimestamp(until) && !n.some((W) => W.uuid === until)) ||
      S.some((W) => W.type === "system" && W.subtype === "compact_boundary")
    )
      r = "rows_before_a_compaction";
    let P = [];
    for (let W of S) {
      let x = getMainThreadTurnUuid(W) !== undefined && s(W);
      if (x === "nor_any_after_it") {
        r = "reply_without_this_sessions_mark";
        break;
      }
      if (x) P.push(W);
    }
    return P.length > 0 ? [P] : [];
  });
  let w = new Set();
  for (let v of flattened) {
    let y = 0;
    let O = 0;
    let index = v.toReversed().findIndex((U, S) => {
      y += Buffer.byteLength(jsonStringify(U));
      O += isPlainObject(U.message) && Array.isArray(U.message.content) ? U.message.content.length : 1;
      return (
        S > 0 && (O > Math.floor(MAX_ROW_AGE_MS / flattened.length) || y > MAX_ROW_BYTES / flattened.length)
      );
    });
    for (let U of index < 0 ? v : v.slice(v.length - index)) w.add(U);
    if (index >= 0) r = "rows_over_the_limits";
  }
  return {
    rows: [...w],
    leftOut: r,
  };
}
//@ chunk-fp6aqx1j.js:7911-8078 placement
function findLastRowBeforeSpans(e, rowsLoaded, s) {
  let index = rowsLoaded.findIndex(
    isAtOrAfterTimestamp(Math.min(...e.map(({ since }) => Date.parse(since)))),
  );
  let uuid = (index < 0 ? rowsLoaded : rowsLoaded.slice(0, index)).findLast(s)?.uuid;
  return typeof uuid === "string" ? uuid : undefined;
}
//@ chunk-fp6aqx1j.js:8078-8190 placement
function isAtOrAfterTimestamp(e) {
  let time = new Date(e).getTime();
  return (s) => typeof s.timestamp === "string" && Date.parse(s.timestamp) >= time;
}
//@ chunk-fp6aqx1j.js:8190-8432 placement
var STREAM_EVENT_TYPES = {
  message_start: true,
  message_delta: true,
  message_stop: true,
  content_block_start: true,
  content_block_delta: true,
  content_block_stop: true,
};
var STREAM_DELTA_TYPES = {
  text_delta: true,
  input_json_delta: true,
  citations_delta: true,
  thinking_delta: true,
  signature_delta: true,
  compaction_delta: true,
};
//@ chunk-fp6aqx1j.js:8432-8725 placement
function stripInputTransformations(e) {
  let { event } = e;
  if (event.type === "message_start" && event.message?.input_transformations) {
    let { input_transformations: inputTransformations, ...r } = event.message;
    return {
      ...e,
      event: {
        ...event,
        message: r,
      },
    };
  }
  if (event.type === "message_delta" && event.input_transformations) {
    let { input_transformations: inputTransformations, ...r } = event;
    return {
      ...e,
      event: r,
    };
  }
  return e;
}
//@ chunk-fp6aqx1j.js:8725-9005 placement
function dropOversizeStreamEvent(e, n) {
  let s = describeStreamEventForTelemetry(e.event);
  let joined = Object.entries(s)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  logForDebugging(
    `CCRClient: dropping oversize ephemeral stream_event (${joined}, ${n} bytes, over the ${MAX_FRAME_BYTES}-byte limit)`,
    {
      level: "warn",
    },
  );
  logFeatureSad("ccr_partial_messages", "oversize_ephemeral_skipped", {
    ...s,
    bytes: n,
  });
}
//@ chunk-fp6aqx1j.js:9005-9295 placement
function describeStreamEventForTelemetry(event) {
  if (!isPlainObject(event))
    return {
      event_type: lit("other"),
    };
  let { type: n, delta, content_block: contentBlock } = event;
  let h = isPlainObject(contentBlock) ? contentBlock.type : undefined;
  return {
    event_type: fromEnum(matchedKeyOrOther(STREAM_EVENT_TYPES, n)),
    ...(n === "content_block_delta" && {
      delta_type: fromEnum(
        matchedKeyOrOther(STREAM_DELTA_TYPES, isPlainObject(delta) ? delta.type : undefined),
      ),
    }),
    ...(n === "content_block_start" && {
      content_block_type: isKnownContentBlockType(h) ? fromEnum(h) : lit("other"),
    }),
  };
}
//@ chunk-fp6aqx1j.js:9295-9359 placement
function matchedKeyOrOther(e, n) {
  for (let key in e) if (key === n) return key;
  return "other";
}
//@ chunk-fp6aqx1j.js:9359-9379 layout
var TEXT_POST_GAP_MS = 500;
var MAX_TIMER_LATENESS_MS = 60000;
//@ chunk-fp6aqx1j.js:9379-9497 layout
function getTextRhythm(e) {
  e.textRhythm ??= {
    posts: 0,
    gapsOver500Ms: 0,
    lastPostAtMs: undefined,
    timerMaxLateMs: undefined,
  };
  return e.textRhythm;
}
//@ chunk-fp6aqx1j.js:9497-9736 fingerprint = accumulateStreamEvents (0.846)
function accumulateStreamEvents(payload) {
  if (payload.type !== "stream_event" || payload.parent_tool_use_id != null) return false;
  let { event } = payload;
  if (!isPlainObject(event) || event.type !== "content_block_delta") return false;
  let { delta } = event;
  return (
    isPlainObject(delta) &&
    delta.type === "text_delta" &&
    typeof delta.text === "string" &&
    /\S/.test(delta.text)
  );
}
//@ chunk-fp6aqx1j.js:9736-9828 affinity
function markTextDeltaRows(e, countedTextEvents) {
  let s = false;
  for (let r of e)
    if (accumulateStreamEvents(r.payload) && !countedTextEvents.has(r)) {
      countedTextEvents.add(r);
      s = true;
    }
  return s;
}
//@ chunk-fp6aqx1j.js:9828-9950 affinity
function recordTextPost(timing, n) {
  let textRhythm = getTextRhythm(timing);
  textRhythm.posts++;
  if (textRhythm.lastPostAtMs !== undefined && n - textRhythm.lastPostAtMs > TEXT_POST_GAP_MS)
    textRhythm.gapsOver500Ms++;
  textRhythm.lastPostAtMs = n;
}
//@ chunk-fp6aqx1j.js:9950-10071 affinity
function recordTimerLateness(timing, n) {
  if (!(n >= 0)) return;
  let textRhythm = getTextRhythm(timing);
  textRhythm.timerMaxLateMs = Math.max(
    textRhythm.timerMaxLateMs ?? 0,
    Math.min(Math.round(n), MAX_TIMER_LATENESS_MS),
  );
}
//@ chunk-fp6aqx1j.js:10071-10761 affinity
class HoldStats {
  counts = {
    wholeTurnHolds: 0,
    wholeTurnHoldsKeptToTurnEnd: 0,
    clientEvents: {
      releases: 0,
      heldRows: 0,
      maxHeldRows: 0,
      maxHeldMs: 0,
    },
    internalEvents: {
      releases: 0,
      heldRows: 0,
      maxHeldRows: 0,
      maxHeldMs: 0,
    },
  };
  wholeTurnHoldStands = false;
  released(e, n, s) {
    let r = e === "client_events" ? this.counts.clientEvents : this.counts.internalEvents;
    r.releases += 1;
    r.heldRows += n;
    r.maxHeldRows = Math.max(r.maxHeldRows, n);
    r.maxHeldMs = Math.max(r.maxHeldMs, s);
  }
  wholeTurnHoldStarted() {
    if (!this.wholeTurnHoldStands) {
      this.wholeTurnHoldStands = true;
      this.counts.wholeTurnHolds += 1;
    }
  }
  wholeTurnHoldEndedEarly() {
    this.wholeTurnHoldStands = false;
  }
  turnEnded() {
    if (this.wholeTurnHoldStands) {
      this.wholeTurnHoldStands = false;
      this.counts.wholeTurnHoldsKeptToTurnEnd += 1;
    }
  }
}
//@ chunk-fp6aqx1j.js:15795-15943 placement
var EMPTY_UPLOAD_TRIM = {};
var DEFAULT_HEARTBEAT_INTERVAL_MS = 20000;
var MIN_HEARTBEAT_INTERVAL_MS = 1e4;
var MAX_HEARTBEAT_LEAD_MS = 15000;
var HEARTBEAT_SAFETY_MARGIN_MS = 5000;
var AUTH_REFRESH_TIMEOUT_MS = HEARTBEAT_SAFETY_MARGIN_MS;
var UNUSED_TIMEOUT_5000_MS = 5000;
var DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS = 300000;
var SHUTDOWN_REQUEST_TIMEOUT_MS = 2000;
var TOKEN_REFRESH_LEAD_MS =
  MAX_HEARTBEAT_LEAD_MS + AUTH_REFRESH_TIMEOUT_MS + 2 * DEFAULT_HEARTBEAT_INTERVAL_MS;
var DEFAULT_PROBE_BEAT_SPACING_MS = 5000;
var HEARTBEAT_STALE_FACTOR = 1.5;
var MAX_CONSECUTIVE_HEARTBEAT_FAILURES = 3;
var HEARTBEAT_FATAL_STATUSES = new Set([401, 403, 404, 429]);
var DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS = 100;
//@ chunk-fp6aqx1j.js:15943-15991 placement
function isClientErrorStatus(status) {
  return status === 400 || status === 413 || status === 422;
}
//@ chunk-fp6aqx1j.js:15991-16184 placement
var EVENT_BATCH_PATH = "/worker/event-batch";
var BATCH_UNSUPPORTED_STATUSES = new Set([404, 405, 501]);
var RIDE_PAUSE_BASE_MS = 60000;
var RIDE_PAUSE_MAX_MS = 1920000;
var X_CCR_UPLOAD_ATTEMPT = "x-ccr-upload-attempt";
var MIN_EVENT_POST_TIMEOUT_MS = 1e4;
var ROWS_SENT_AGAIN_WAIT_MS = 60000;
var WORKER_STATE_FLUSH_TIMEOUT_MS = 1e4;
var URGENT_EVENT_POST_TIMEOUT_MS = 60000;
var ONE_MIB = 1048576;
var MAX_EVENT_BATCH_BYTES = 4 * ONE_MIB - 65536;
var POST_TIMEOUT_MS_PER_MIB = 5000;
var DEFAULT_MAX_EVENT_POST_TIMEOUT_MS = 120000;
var LARGE_BATCH_RETRY_BACKOFF = 1.5;
var LARGE_BATCH_BYTES = 262144;
//@ chunk-fp6aqx1j.js:16184-16360 placement
/**
 * 按批次字节数估算事件 POST 超时：基础 10s 加每 MiB 5s，大批次（≥256KiB 且不可切分）按重试次数指数放大，夹在 minMs–maxMs。
 */
function computeEventPostTimeoutMs(e, { maxMs, minMs = MIN_EVENT_POST_TIMEOUT_MS }) {
  let r =
    MIN_EVENT_POST_TIMEOUT_MS + Math.round((e.bytes / ONE_MIB) * (POST_TIMEOUT_MS_PER_MIB / 1000)) * 1000;
  let h = e.bytes >= LARGE_BATCH_BYTES && !e.cuttable ? r * LARGE_BATCH_RETRY_BACKOFF ** e.retryCount : r;
  return Math.max(minMs, Math.min(maxMs, Math.round(h)));
}
//@ chunk-fp6aqx1j.js:16360-16420 placement
var SERVABLE_CONTROL_SUBTYPES = new Set(["remote_tool_call", "remote_plumbing_call"]);
//@ chunk-fp6aqx1j.js:16420-16456 placement
function isServableControlRequest(e) {
  return SERVABLE_CONTROL_SUBTYPES.has(getControlRequestSubtypeOfEvent(e));
}
//@ chunk-fp6aqx1j.js:16456-16781 placement
/**
 * CCR 客户端的控制请求子类型集合与相关上限常量（可服务调用的子类型、可透传的设置类子类型等）。
 */
var SERVED_CALL_REQUEST_SUBTYPES = new Set(REMOTE_TOOLS_LOG_EVENTS);
var MAX_URGENT_REQUEST_IDS = 256;
var SETTINGS_CONTROL_SUBTYPES = new Set([
  "apply_flag_settings",
  "set_max_thinking_tokens",
  "set_permission_mode",
  "mcp_set_servers",
  "mcp_reconnect",
  "reload_skills",
]);
var DEFAULT_SETTINGS_ANSWER_WAIT_MS = 1000;
var MAX_SETTINGS_REQUEST_IDS = 64;
var HOUSEKEEPING_CONTROL_SUBTYPES = new Set([
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
  let request = e.payload.type === "control_request" ? e.payload.request : undefined;
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-fp6aqx1j.js:17066-17191 placement = mergeClients (1)
function mergeClients(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode) return errnoCode;
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string")
    return error.name;
  return;
}
//@ chunk-fp6aqx1j.js:17191-17320 fingerprint = CCRInitError (0.859)
/**
 * CCRClient 初始化失败错误（reason + httpStatus）。
 */
class CCRInitError extends Error {
  reason;
  httpStatus;
  constructor(e, httpStatus) {
    super(`CCRClient init failed: ${e}`);
    this.reason = e;
    this.httpStatus = httpStatus;
  }
}
//@ chunk-fp6aqx1j.js:17320-17416 placement
/**
 * 判断是否为 worker_register_failed 且非 4xx 的初始化失败（可重试）。
 */
function isWorkerRegisterFailure(error) {
  return (
    error instanceof CCRInitError &&
    error.reason === "worker_register_failed" &&
    !isClientErrorStatus(error.httpStatus)
  );
}
//@ chunk-fp6aqx1j.js:17416-17749 placement
/**
 * 连续鉴权失败上限，以及 WebSocket 关闭原因到关闭码的映射（epoch 冲突、被取代、令牌过期等）。
 */
var MAX_CONSECUTIVE_AUTH_FAILURES = 10;
var WORKER_CONFLICT_CLOSE_CODES = {
  epoch_conflict: 4090,
  superseded_by_worker: 4090,
  session_not_active: 4090,
  epoch_stale: 4090,
  session_not_found: 4090,
  token_expired: 4094,
  auth_exhausted: 4094,
};
var CONFLICT_REASON_IS_SUPERSEDED = {
  epoch_conflict: true,
  superseded_by_worker: true,
  session_not_active: true,
  epoch_stale: true,
  session_not_found: false,
  token_expired: false,
  auth_exhausted: false,
};
var MAX_CONSECUTIVE_NOT_FOUND = 3;
var DEFAULT_MAX_ATTEMPTS = 10;
var RETRY_COUNT_3 = 3;
var WORKER_STATE_MAX_ATTEMPTS = 3;
var INTERNAL_EVENT_UUID_BATCH_SIZE = 100;
//@ chunk-fp6aqx1j.js:17749-18138 placement
/**
 * 流式读取响应体，超过字节上限时取消并返回 null；解码出空串但读到字节视为内存不足抛 RangeError。
 */
async function readBodyCapped(e, n) {
  let reader = e.body?.getReader();
  let textDecoder = new TextDecoder();
  let h = "";
  let w = 0;
  for (let v = await reader?.read(); v !== undefined && !v.done; v = await reader?.read()) {
    w += v.value.byteLength;
    if (w > n) {
      await reader?.cancel();
      return null;
    }
    let y = textDecoder.decode(v.value, {
      stream: true,
    });
    if (y === "" && v.value.byteLength > 6) {
      reader?.cancel().catch(() => {});
      throw RangeError("out of memory while decoding a page");
    }
    h += y;
  }
  return {
    text: h + textDecoder.decode(),
    bytes: w,
  };
}
//@ chunk-fp6aqx1j.js:18138-18246 placement
function isTimestampWithinLimit(e, maxTimestampChars) {
  let timestamp = e.payload?.timestamp;
  return (
    maxTimestampChars === undefined ||
    timestamp === undefined ||
    (typeof timestamp === "string" && timestamp.length <= maxTimestampChars)
  );
}
//@ chunk-fp6aqx1j.js:18246-18266 placement
var INIT_STATE_ORDERING_BOUND_MS = 1e4;
var MAX_RETRY_DELAY_MS = 30000;
//@ chunk-fp6aqx1j.js:18266-18345 placement
function durableUploadOutcome(status) {
  return status !== undefined && status >= 400 && status < 500 ? "not_accepted" : "indeterminate";
}
//@ chunk-fp6aqx1j.js:18345-18551 placement
function detectTaskBookends(e) {
  let n = false;
  let s = false;
  for (let r of e)
    if (r.payload.subtype === "task_notification") n = true;
    else if (r.payload.subtype === "background_tasks_changed") s = true;
  return n || s
    ? {
        has_terminal_bookend: n,
        has_level: s,
      }
    : null;
}
//@ chunk-fp6aqx1j.js:18551-18623 placement
function clampInt32(e) {
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
};
var MAX_REFUSED_INTERNAL_EVENT_UUIDS = 512;
var UPGRADE_RELAY_MARKER = "upgrade_relay_marker";
//@ chunk-fp6aqx1j.js:19042-19658 placement
/**
 * 云会话 worker pending_action 及事件列表的 zod schema（事件、分页、agent_metadata、批量写入结果）。
 */
var pendingActionSchema = DoctorLazy(() =>
  u({
    tool_name: string().refine((e) => !e.startsWith("dialog:")),
    display_tool_name: string().nullish(),
    action_description: string(),
    raw_command: string().nullish(),
    request_id: string(),
    tool_use_id: string().min(1),
    suppressed_request_id: string().nullish(),
  }),
);
var sessionEventSchema = DoctorLazy(() =>
  looseObject({
    event_id: string(),
    event_type: string(),
    payload: record(string(), unknown()),
    event_metadata: record(string(), unknown()).nullish(),
    is_compaction: M(),
    created_at: string(),
    session_agent_id: string().optional(),
  }),
);
var sessionEventsPageSchema = DoctorLazy(() =>
  u({
    data: array(sessionEventSchema()),
    next_cursor: string().optional(),
  }),
);
var agentMetadataEventsSchema = DoctorLazy(() =>
  u({
    data: array(
      sessionEventSchema().extend({
        payload: looseObject({
          type: literal("agent_metadata"),
        }),
        session_agent_id: string(),
      }),
    ).optional(),
  }),
);
var eventBatchResultSchema = DoctorLazy(() =>
  u({
    results: array(
      u({
        event_id: string(),
        duplicate: M(),
      }),
    ),
  }),
);
//@ chunk-fp6aqx1j.js:19658-19986 placement
/**
 * 用 schema 解析待处理动作（工具调用审批请求），取得 requestId 后返回规范化的动作对象；不合法时返回 undefined。
 */
function parsePendingAction(pendingAction) {
  let n = pendingActionSchema().safeParse(pendingAction);
  if (!n.success) return;
  let s = n.data;
  let r = requestIdOf(s);
  if (r === undefined) return;
  return {
    requestId: r,
    details: buildRequiresActionDetails({
      tool_name: s.tool_name,
      display_tool_name: s.display_tool_name ?? undefined,
      action_description: s.action_description,
      raw_command: s.raw_command ?? undefined,
      request_id: s.request_id,
      tool_use_id: s.tool_use_id,
    }),
  };
}
//@ chunk-fp6aqx1j.js:19986-20341 placement
/**
 * 根据 worker 外部状态里的 pending_action 判断会话是否处于 requires_action：读取中/失败/无待办/无法上报时返回 idle 与原因，否则带 requestId 与详情返回 requires_action。
 */
function resolveWorkerRequiresActionState(e) {
  if (e === "pending")
    return {
      status: "idle",
      reason: "get_pending",
    };
  if (e.readFailed)
    return {
      status: "idle",
      reason: "get_failed",
    };
  let pendingAction = e.external?.pending_action;
  if (pendingAction === undefined || pendingAction === null)
    return {
      status: "idle",
      reason: "no_pending_action",
    };
  let pendingAction_2 = parsePendingAction(pendingAction);
  if (!pendingAction_2)
    return {
      status: "idle",
      reason: "not_reportable",
    };
  return {
    status: "requires_action",
    reason: "park",
    ...pendingAction_2,
  };
}
//@ chunk-fp6aqx1j.js:20599-22423 placement
/**
 * CCR 客户端默认批量策略常量：事件数/年龄/字节上限、跨模型调用持有、事件脉冲与拾取等待、入站 UUID 容量、查看器检查点、可等待事件集合等。
 */
var WorkerLimitsSchema = DoctorLazy(() =>
  looseObject({
    max_events: E().nullish(),
    max_age_ms: E().nullish(),
    max_bytes: E().nullish(),
    flush_on_sampling_end: M().nullish(),
    flush_on_assistant: M().nullish(),
    event_batch_upload: M().nullish().catch(undefined),
    hold_across_model_calls: M().nullish().catch(undefined),
    hold_again: looseObject({
      soft_age_ms: E().nullish(),
      soft_events: E().nullish(),
      after: array(string()).nullish(),
      never_after_tools: array(string()).nullish(),
      tools_whose_results_wait: array(string()).nullish(),
      later_worker_holds_first_turn: M().nullish().catch(undefined),
    })
      .nullish()
      .catch(undefined),
    may_wait_types: array(string()).nullish().catch(undefined),
    flush_after_tool_names: array(string()).nullish().catch(undefined),
    settings_receipts_max_wait_ms: E().nullish().catch(undefined),
    messages_received_waits: M().nullish().catch(undefined),
    receipts_ride_uploads: M().nullish().catch(undefined),
    flush_before_tools_wait_ms: E().nullish(),
    flush_after_tools: string().nullish(),
    must_flush_types: array(string()).nullish(),
    live_twin_types: array(string()).nullish().catch(undefined),
    live_only_types: array(string()).nullish().catch(undefined),
    transcript_max_age_ms: E().nullish().catch(undefined),
    no_turn_max_age_ms: E().nullish().catch(undefined),
    merge_worker_reports: M().nullish().catch(undefined),
    control_traffic_keeps_hold: M().nullish().catch(undefined),
    empty_checkpoint_keeps_hold: M().nullish().catch(undefined),
    first_turn_holds_each_call: M().nullish().catch(undefined),
    settings_answers_max_wait_ms: E().nullish().catch(undefined),
    init_max_wait_ms: E().nullish().catch(undefined),
    metadata_waits_for_status: array(string()).nullish().catch(undefined),
    metadata_never_sent: array(string()).nullish().catch(undefined),
    metadata_max_wait_ms: E().nullish().catch(undefined),
    cost_report_max_wait_ms: E().nullish().catch(undefined),
    policy_version: string().nullish(),
  }),
);
var DEFAULT_MAX_HOLD_EVENTS = 50;
var DEFAULT_MAX_HOLD_EVENTS_ACROSS_CALLS = 90;
var DEFAULT_MAX_HOLD_AGE_MS = 120000;
var DEFAULT_TRANSCRIPT_MAX_AGE_MS = 60000;
var MAX_HOLD_AGE_MS = 240000;
var EVENTS_PULSE_INTERVAL_MS = 30000;
var DEFAULT_PICKUP_WAIT_MS = 5000;
var PICKUP_BARRIER_MAX_WRITES = 1000;
var MAX_INBOUND_MESSAGE_UUIDS = 256;
var DEFAULT_START_REPORTS_MAX_WAIT_MS = 2000;
var VIEWER_CHECKPOINT_INTERVAL_MS = 5000;
var DEFAULT_MAX_HOLD_BYTES = 1048576;
var TOOLS_WHOSE_INPUT_MAY_WAIT = new Set(["Bash", "Write", "Edit", "NotebookEdit", "Agent"]);
var MAX_TOOL_INPUT_CHARS_BEFORE_FLUSH = 256;
var MAX_TOOL_INPUT_FLUSH_MS = 5000;
var MAX_MUST_FLUSH_TYPES = 32;
var MAX_HOLD_AGAIN_TOOL_NAMES = 32;
var DEFAULT_SETTINGS_RECEIPTS_MAX_WAIT_MS = MAX_HOLD_AGE_MS;
var MAX_LIVE_ONLY_TYPE_REFUSALS = 16;
//@ chunk-fp6aqx1j.js:22423-22463 placement
function isProcessedReceipt(e, n) {
  return n === "processed";
}
//@ chunk-fp6aqx1j.js:22463-23833 placement
/**
 * CCR 客户端的实时/元数据事件集合与刷写策略常量：live-only 与 may-wait 事件类型、可上报元数据键、响应字节上限、flush 前后工具等待、订阅者标志等。
 */
var FLAG_CONTROL_SUBTYPES = new Set(["apply_flag_settings", "set_max_thinking_tokens", "mcp_set_servers"]);
var SYSTEM_FOREGROUND_SHELL_TASK_ROWS = "system/foreground_shell_task_rows";
var SYSTEM_STATUS_REQUESTING_REPEAT = "system/status_requesting_repeat";
var SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING = "system/status_requesting_repeat_releasing";
var SYSTEM_STATUS_REQUESTING_REPEAT_STARTING = "system/status_requesting_repeat_starting";
var LIVE_ONLY_EVENT_TYPES = new Set([
  "system/task_summary",
  SYSTEM_FOREGROUND_SHELL_TASK_ROWS,
  SYSTEM_STATUS_REQUESTING_REPEAT,
  SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING,
  SYSTEM_STATUS_REQUESTING_REPEAT_STARTING,
]);
var MAY_WAIT_EVENT_TYPES = new Set([
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
]);
var MAX_LIVE_TWIN_TYPES = 32;
var STATUS_PAYLOAD_METADATA_KEYS = new Set([
  "post_turn_summary",
  "recap",
  "context_usage",
  "rate_limit_info",
  "task_summary",
]);
var STATUS_METADATA_KEYS_ALL = new Set([...STATUS_PAYLOAD_METADATA_KEYS, "last_served_model"]);
var DEFAULT_COST_REPORT_MAX_WAIT_MS = MAX_HOLD_AGE_MS;
var REPORTABLE_METADATA_KEYS = new Set([
  "context_usage",
  "cross_session_inbound",
  "is_ultraplan_mode",
  "last_served_model",
  "permission_mode",
  "rate_limit_info",
]);
var MAX_LIVE_RESPONSE_BYTES = 57344;
var MAX_EVENT_PAYLOAD_ESTIMATED_BYTES = 64512;
var POLICY_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,16}$/;
var DEFAULT_FLUSH_BEFORE_TOOLS_WAIT_MS = 30000;
var DEFAULT_TOOL_CALL_ROW_GRACE_MS = 2000;
var FLUSH_AFTER_TOOLS_MODES = ["none", "write", "all"];
var MAX_EPHEMERAL_RECEIPT_IDS = 64;
var MAX_VIEWER_ROWS_BEFORE_FLUSH = 50;
var HELD_ROWS_MAX_AGE_MS = 5000;
var SUBSCRIBER_FLAG_REQUIRED = false;
var RECENT_INBOUND_EVENT_MS = 3000;
var VIEWER_LEFT_GRACE_MS = 1e4;
var isEphemeralOrKeepAlive = (e) => e.ephemeral === true || e.payload.type === "keep_alive";
var isEphemeralKeepAliveOrControlResponse = (e) =>
  isEphemeralOrKeepAlive(e) || e.payload.type === "control_response";
var neverFlush = () => false;
//@ chunk-fp6aqx1j.js:23833-23887 placement
/**
 * 从 CLAUDE_CODE_WORKER_EPOCH 读取 worker epoch（缺失时为 NaN）。
 */
function workerEpochFromEnv() {
  return env.CLAUDE_CODE_WORKER_EPOCH ?? NaN;
}
//@ chunk-fp6aqx1j.js:23887-24110 placement
var CUMULATIVE_COST_KEYS = [
  "cumulative_cost_usd",
  "cumulative_input_tokens",
  "cumulative_output_tokens",
  "cumulative_cache_read_tokens",
  "cumulative_cache_write_tokens",
];
var COST_STATE_METADATA_KEYS = new Set([
  ...CUMULATIVE_COST_KEYS,
  "cost_state",
  "memory_extract_place",
  "model_turn_stored",
]);
//@ chunk-fp6aqx1j.js:24110-24253 placement
function pickCostAndModelMetadata(e) {
  return Object.entries(e).filter(
    ([key]) =>
      COST_STATE_METADATA_KEYS.has(key) ||
      key === "last_served_model" ||
      key === "worker_permission_mode" ||
      key === "card_turn_stamp",
  );
}
//@ chunk-fp6aqx1j.js:24253-24313 placement
function jsonStringEncodedSize(e) {
  return 1 + (e < 128 ? 1 : e < 16384 ? 2 : e < 2097152 ? 3 : 4) + e;
}
//@ chunk-fp6aqx1j.js:24313-24601 placement
function estimateJsonEncodedSize(e) {
  if (typeof e === "string") return jsonStringEncodedSize(Buffer.byteLength(e));
  if (typeof e === "number") return 9;
  let n = 0;
  if (Array.isArray(e)) for (let s of e) n += jsonStringEncodedSize(estimateJsonEncodedSize(s));
  else if (isPlainObject(e)) {
    for (let [key, value] of Object.entries(e))
      if (value !== undefined)
        n += jsonStringEncodedSize(
          jsonStringEncodedSize(Buffer.byteLength(key)) +
            jsonStringEncodedSize(estimateJsonEncodedSize(value)),
        );
  } else return 2;
  return jsonStringEncodedSize(n);
}
//@ chunk-fp6aqx1j.js:24601-24700 placement
function isClientEventNotFoundError(e) {
  let error = e?.error;
  return error?.type === "not_found_error" && error.resource_type === "client_event";
}
//@ chunk-fp6aqx1j.js:24700-24758 placement
function equalsIgnoreCase(e, n) {
  return e.toLowerCase() === n.toLowerCase();
}
//@ chunk-fp6aqx1j.js:24758-24974 placement
function describeUploadFailure(status) {
  if (status === 404) return "http_404_unknown_body";
  if (status === 401 || status === 403) return "http_refused";
  if (status === 429) return "http_rate_limited";
  if (status === 501) return "http_not_served";
  return status >= 500 ? "http_server_error" : "http_other";
}
//@ chunk-fp6aqx1j.js:24974-25162 placement
var clientEventSchema = DoctorLazy(() =>
  u({
    event_id: string(),
    source: literal("client"),
    created_at: string(),
    payload: looseObject({
      uuid: string(),
    }),
    sent_by_account_id: string().nullish(),
    device_attestation_status: unknown().optional(),
    session_agent_owned: M(),
  }),
);
//@ chunk-fp6aqx1j.js:25162-25628 placement
function parseDeliveryEvent(e, n) {
  let s = clientEventSchema().safeParse(e);
  if (!s.success)
    return {
      kind: "unavailable",
      why: "malformed",
    };
  let { event_id: eventId, created_at: createdAt, payload } = s.data;
  let timestamp = Date.parse(createdAt);
  if (!equalsIgnoreCase(eventId, n) || !Number.isFinite(timestamp) || !equalsIgnoreCase(payload.uuid, n))
    return {
      kind: "unavailable",
      why: "malformed",
    };
  return {
    kind: "event",
    event: {
      eventId: n,
      createdAtMs: timestamp,
      sentByAccountId: s.data.sent_by_account_id ?? undefined,
      deviceAttestationStatus: s.data.device_attestation_status,
      sessionAgentOwned: s.data.session_agent_owned,
      payload,
    },
  };
}
//@ chunk-fp6aqx1j.js:25921-134287 callgraph-witnessed = CCRClient (0.237)
/**
 * CCRClient：云端 worker 与 CCR 会话服务的客户端：注册 worker（epoch）、心跳、上传事件/状态、接收 served call 与冲突处理（superseded_by_worker、epoch_stale）。
 */
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
  seesModelCallBoundaries = false;
  lastRequestingList;
  turnTookInput = false;
  housekeepingRequestIds = new Set();
  toolResultEndsCall = false;
  liveOnlyRequestingRow;
  heldRepeatUuid;
  subAgentWroteSinceStoredRequesting = false;
  indexBehindHeldToolResult;
  liveOnlyStartingRow;
  turnHold = "open";
  modelTurnEnded = false;
  recordAtStart;
  reportedKeys = new Set();
  autocompactStateStored;
  stateRowTypesWritten = new Set();
  sessionModelTurnStored = false;
  resultThatMarks;
  secondCallStartsHold = false;
  modelCallStreamed = false;
  streamedResponseId;
  holdsNoMoreThisTurn = false;
  newestResponseId;
  unansweredCalls = new Set();
  callsWhoseResultsWait = new Set();
  heldResultNeedsStore = false;
  pickupBarriers = [];
  pickupTakesTick = false;
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
  shutdownReleased = false;
  shutdownKeepsClientEvents = false;
  shutdownBeganAtMs = 0;
  owedMetadataDropsAtShutdown = 0;
  viewerAbsentReported = false;
  stopToolCallGate;
  keepAliveAtWorkStart;
  stopWorkStartKeepAlive;
  toolCallRows = {
    client_events: new Map(),
    internal_events: new Map(),
  };
  toolCallRowWaiters = new Map();
  awaitedToolCalls = new Set();
  transcriptLaneInUse = false;
  toolCallsWhoseResultReleases = new Set();
  lanesNotAnswering = new Set();
  loggedUnreadableFlushPolicy = false;
  loggedTranscriptEnvelopeStrip = false;
  loggedToolResultBlank = false;
  loggedMcpImageBlank = false;
  loggedRequestIdKept = false;
  maxAdvisedIntervalMs;
  beatOnStaleReconnect;
  beatOnReactivation;
  skipRedundantHeartbeats;
  idleTracker;
  unsubscribeIdleTracker;
  probeBeatSpacingMs;
  heartbeatTimer = null;
  heartbeatInFlight = false;
  lastHeartbeatSentAtMs = 0;
  lastCadenceTickAtMs = 0;
  lastBeatingEventsPostOkAtMs = 0;
  lastEventsAnswerOrPulseAtMs = 0;
  skippedPreviousCadenceBeat = false;
  lastHeartbeatSuccessAtMs = Date.now();
  heartbeatsSent = 0;
  lastSucceededBeat = 0;
  lastSettledBeat = 0;
  lastHeartbeat429AtMs = 0;
  idleGrantLatched = false;
  reactivationBeatArmed = false;
  pendingForcedBeat = false;
  probeBeatTimer = null;
  pendingBeatTrigger = null;
  closed = false;
  closeAbort = new AbortController();
  goodbyeFlushed = Promise.resolve();
  leftMidTurn = false;
  epochSuperseded = false;
  lastEpochMismatchCause;
  epochMismatchCount = 0;
  consecutiveAuthFailures = 0;
  lastAuthRefreshBadReason = null;
  consecutiveNotFound = 0;
  consecutiveHeartbeatFailures = 0;
  currentState = null;
  reportParkAtInit;
  guardsClientRows;
  hasDisplayHooks = undefined;
  displayHookSeen = false;
  clientRowsOwed = new TurnLedger();
  ownRowsWaitBehindRowsSentAgainSince = undefined;
  initExternalMetadata;
  initialWorkerStatus;
  initStateGetOrderingBoundMs;
  stateReadEndsAtRegistration;
  startReportsMaxWaitMs;
  startReportsWaitUntilMs = 0;
  parkReportedAtInitRequestId = undefined;
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
  firstContentFlushPending = false;
  toolInputFlushMs = 0;
  toolInputMayWait = false;
  toolInputChars = 0;
  streamEventTimerIsSlow = false;
  streamEventsTakenAt = 0;
  loggedToolInputFlush = false;
  parkedRows = [];
  noSubscriberStreamEventFlushIntervalMs = 0;
  noSubscriberUploadHoldMs = 0;
  closingForSuccessor = false;
  uploadHoldTally = new HoldStats();
  undeliveredClientEventsAtClose;
  undeliveredInternalEventsAtClose;
  dropUnwatchedStreamEvents = false;
  lastReportedHasSubscribers;
  lastInboundEventAtMs = Number.NEGATIVE_INFINITY;
  viewerReportedSinceLastFalse = false;
  lastViewerLeftAtMs = Number.NEGATIVE_INFINITY;
  unwatchedPastGrace = false;
  hasSubscribersReports = 0;
  streamEventsDroppedUnwatched = 0;
  streamedEphemeralSinceLastAssistant = false;
  workerState;
  eventUploader;
  workerSocket;
  internalEventUploader;
  ridingRows;
  takenRiders;
  ridesRefused = false;
  ridesPausedUntilMs = 0;
  routeOnlyFailures = 0;
  ridePauses = 0;
  failedRide;
  loggedRowsLeftOut = false;
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
  receiptsRideRefused = false;
  onEpochMismatch;
  lastLineWhen;
  onDurableEventsDropped = undefined;
  onDurableEventsUpload = undefined;
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
  heartbeatLostFiredForStreak = false;
  adoptRefreshedAuth;
  gzipRequestBodyFetch;
  ownConnectionPool;
  constructor(e, n, s) {
    this.lastLineWhen = s?.onEpochMismatch ? "queued" : "now";
    this.onEpochMismatch =
      s?.onEpochMismatch ??
      (() => {
        process.exit(1);
      });
    this.onHeartbeatLost = s?.onHeartbeatLost;
    this.readTransport = e;
    this.workerSocket = s?.workerSocket;
    this.nonOrigin403Transient = s?.nonOrigin403Transient ?? false;
    this.heartbeatIntervalMs = s?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.seedHeartbeatIntervalMs = this.heartbeatIntervalMs;
    this.advertiseHeartbeatProbeSupport = s?.advertiseHeartbeatProbeSupport ?? false;
    this.uploadTrim = s?.uploadTrim ?? (() => EMPTY_UPLOAD_TRIM);
    this.keepsRequestId = () => s?.keepsRequestId?.() === true;
    this.uploadHoldMarker = () => s?.uploadHoldMarker?.() === true;
    let liveOnlyShellTaskRows = s?.liveOnlyShellTaskRows;
    this.shellTaskRowsLiveOnly = liveOnlyShellTaskRows
      ? () => liveOnlyShellTaskRows.enabled() === true
      : () =>
          this.followsServedPolicy &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_FOREGROUND_SHELL_TASK_ROWS) === true;
    this.liveOnlyShellStarts = liveOnlyShellTaskRows?.starts ?? new Map();
    this.artifactSocketIds = s?.artifactSocketIds;
    this.servedCallRequestsJumpQueue = () => s?.servedCallRequestsJumpQueue?.() === true;
    this.maxEventPostTimeoutMs = s?.maxEventPostTimeoutMs ?? DEFAULT_MAX_EVENT_POST_TIMEOUT_MS;
    this.followsServedPolicy = s?.followsServedPolicy === true;
    this.keepAliveAtWorkStart = s?.keepAliveAtWorkStart;
    this.launchFlushPolicy = s?.launchFlushPolicy;
    this.processExiting = s?.processExiting ?? (() => false);
    this.gatesToolCalls = s?.gatesToolCalls === true;
    this.toolCallRowGraceMs = s?.toolCallRowGraceMs ?? DEFAULT_TOOL_CALL_ROW_GRACE_MS;
    this.pickupWaitMs = s?.pickupWaitMs ?? DEFAULT_PICKUP_WAIT_MS;
    this.beatOnStaleReconnect = s?.beatOnStaleReconnect ?? false;
    this.idleTracker = s?.idleTracker;
    this.beatOnReactivation = (s?.beatOnReactivation ?? false) && this.idleTracker !== undefined;
    this.skipRedundantHeartbeats = s?.skipRedundantHeartbeats ?? false;
    this.probeBeatSpacingMs = s?.probeBeatSpacingMs ?? DEFAULT_PROBE_BEAT_SPACING_MS;
    this.heartbeatJitterFraction = s?.heartbeatJitterFraction ?? 0;
    this.maxAdvisedIntervalMs = this.maxAdvisedIntervalFor(this.advertiseHeartbeatProbeSupport);
    this.getAuthHeaders = s?.getAuthHeaders ?? getSessionIngressAuthHeaders;
    let isFirstPartyProvider = s?.isFirstPartyProvider;
    this.providerWithheldReason =
      isFirstPartyProvider === undefined
        ? () => "provider-unknown"
        : () => (isFirstPartyProvider() ? undefined : "data-residency");
    this.onDiagnostic = s?.onDiagnostic;
    this.onCardRecordRefused = s?.onCardRecordRefused;
    this.onRequestAuthOk = s?.onRequestAuthOk;
    this.adoptRefreshedAuth = s?.adoptRefreshedAuth;
    this.gzipRequestBodyFetch = s?.gzipRequestBodyFetch;
    this.ownConnectionPool = s?.ownConnectionPool;
    this.reportParkAtInit = s?.reportParkAtInit ?? false;
    this.guardsClientRows = s?.guardsClientRows ?? (() => false);
    this.initExternalMetadata = s?.initExternalMetadata ?? {};
    this.initialWorkerStatus = s?.initialWorkerStatus ?? "idle";
    this.initStateGetOrderingBoundMs = s?.initStateGetOrderingBoundMs ?? INIT_STATE_ORDERING_BOUND_MS;
    this.stateReadEndsAtRegistration = s?.stateReadEndsAtRegistration ?? false;
    this.startReportsMaxWaitMs = s?.startReportsMaxWaitMs ?? DEFAULT_START_REPORTS_MAX_WAIT_MS;
    this.readSource = {
      ...convertWsUrlToPostUrl(n, this.getAuthHeaders),
      isClosed: () => this.closed,
      onConflict: (v) => this.handleEpochMismatch(v),
      ownConnectionPool: this.ownConnectionPool,
    };
    this.sessionBaseUrl = this.readSource.sessionBaseUrl;
    this.sessionId = n.pathname.replace(/\/$/, "").split("/").pop() || "";
    this.workerState = new WorkerStateUploader({
      send: async (v) => {
        let y =
          this.clientRowsOwed.writesNoMore && isPlainObject(v.internal_metadata)
            ? {
                ...v,
                internal_metadata: Uo(v.internal_metadata, "client_rows_owed"),
              }
            : v;
        let O = await this.request(
          "put",
          "/worker",
          {
            worker_epoch: this.workerEpoch,
            ...y,
          },
          "PUT worker",
        );
        if (O.ok) {
          if (y.worker_status !== undefined) logFeatureOk("ccr_worker_state_publish");
          return true;
        }
        if (this.closed && O.status === 409) {
          logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", {
            status: O.status,
          });
          this.droppedWorkerStatePatchCount++;
          if (this.workerState.keepsWithoutStatus(y)) this.droppedOwedMetadataPatchCount++;
          return true;
        }
        if (isClientErrorStatus(O.status)) {
          logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", {
            status: O.status,
          });
          this.droppedWorkerStatePatchCount++;
          if (this.workerState.keepsWithoutStatus(y)) this.droppedOwedMetadataPatchCount++;
          if (isPlainObject(y.internal_metadata) && "client_rows_owed" in y.internal_metadata) {
            logFeatureSad("ccr_client_rows_owed", "report_with_note_refused", {
              status: O.status,
            });
            this.clientRowsOwed.reportWithNoteRefused();
          }
          let internalMetadata = isPlainObject(y.internal_metadata) ? y.internal_metadata : {};
          let externalMetadata = isPlainObject(y.external_metadata) ? y.external_metadata : {};
          if (isPlainObject(externalMetadata.pending_action)) this.onCardRecordRefused?.(O.status, y);
          let { internal_metadata: internalMetadata_2, external_metadata: externalMetadata_2, ...W } = y;
          let x = pickCostAndModelMetadata(internalMetadata);
          let z = pickCostAndModelMetadata(externalMetadata);
          if (
            (x.length > 0 && z.length > 0) ||
            (x.length + z.length > 0 &&
              x.length + z.length <
                Object.keys(W).length +
                  Object.keys(internalMetadata).length +
                  Object.keys(externalMetadata).length)
          )
            this.workerState.requeueMetadata({
              ...(x.length > 0 && {
                internal_metadata: Object.fromEntries(x),
              }),
              ...(z.length > 0 && {
                external_metadata: Object.fromEntries(z),
              }),
            });
          if (y.worker_status !== undefined) {
            let K = {
              worker_status: y.worker_status,
              ...("requires_action_details" in y && {
                requires_action_details: y.requires_action_details,
              }),
              ...("reply_degraded" in internalMetadata && {
                internal_metadata: {
                  reply_degraded: internalMetadata.reply_degraded,
                },
              }),
            };
            if (Object.keys(y).length > Object.keys(K).length || Object.keys(internalMetadata).length > 1) {
              this.workerState.requeueStatus(K);
              return true;
            }
            logFeatureSad("ccr_worker_state_publish", "state_4xx_dropped");
          }
          return true;
        }
        return false;
      },
      baseDelayMs: 500,
      maxDelayMs: 30000,
      jitterMs: 500,
      ridesAStatus: ["reply_degraded", "card_turn_stamp"],
      mergesSameRun: () => this.flushPolicy?.mergeWorkerReports === true && this.followsServedPolicy,
      waitsForStatus: (v) => {
        let flushPolicy = this.flushPolicy;
        let { external_metadata: externalMetadata = {}, internal_metadata: internalMetadata = {}, ...U } = v;
        if (
          !flushPolicy ||
          !this.followsServedPolicy ||
          Object.keys(U).length > 0 ||
          !isPlainObject(externalMetadata) ||
          !isPlainObject(internalMetadata) ||
          [...Object.values(externalMetadata), ...Object.values(internalMetadata)].includes(null)
        )
          return false;
        let S = this.startReportsWaitUntilMs - performance.now();
        if (
          flushPolicy.mergeWorkerReports &&
          S > 0 &&
          this.inboundMessageUuids.size > 0 &&
          !("worker_permission_mode" in internalMetadata)
        )
          return S;
        if (
          this.currentState !== "running" ||
          !Object.keys(externalMetadata).every((key) => flushPolicy.metadataWaitsForStatus.has(key)) ||
          !Object.keys(internalMetadata).every(
            (key) => flushPolicy.costReportMaxWaitMs > 0 && COST_STATE_METADATA_KEYS.has(key),
          )
        )
          return false;
        if (Object.keys(internalMetadata).length > 0) return flushPolicy.costReportMaxWaitMs;
        return Object.keys(externalMetadata).length > 0;
      },
    });
    this.eventUploader = new ClientEventUploader({
      maxBatchSize: 100,
      maxBatchBytes: () => Math.min(10 * ONE_MIB, this.workerSocket?.maxBatchBytes() ?? 1 / 0),
      maxQueueSize: 1e5,
      send: this.settlesTakenRiders(async (v, y) => {
        let O = dedupeEventsByUuid(v);
        if (O > 0)
          logForDebugging(`CCRClient: dropped ${O} repeated-uuid durable event(s) from one live-view POST`);
        let ridingRows = y.urgent ? undefined : this.ridingRows;
        let failedRide = this.failedRide;
        this.failedRide = undefined;
        if (
          ridingRows &&
          (this.ridesAreOff() ||
            v.every((N) => isEphemeralOrKeepAlive(N) || N.payload.type === "control_response") ||
            y.bytes + ridingRows.bytes >
              Math.min(MAX_EVENT_BATCH_BYTES, this.workerSocket?.maxBatchBytes() ?? 1 / 0))
        ) {
          this.giveBackRidingRows();
          ridingRows = undefined;
        }
        if (ridingRows) {
          this.ridingRows = undefined;
          this.takenRiders = ridingRows;
        }
        let S = !y.urgent && !v.every(isEphemeralKeepAliveOrControlResponse);
        if (
          S &&
          this.receiptsMayRide() &&
          this.messagesInProcessing.size > 0 &&
          v.some((N) => N.payload.type === "result")
        ) {
          await new Promise((resolve) => {
            this.resultPostWaits = resolve;
            setImmediate(resolve);
          });
          this.resultPostWaits = undefined;
          this.messagesInProcessing.clear();
        }
        let P =
          S && this.receiptsMayRide()
            ? [...this.waitingReceipts]
                .filter(([N, q]) => q === "processed" && normalizeUuidOrNull(N) !== null)
                .slice(0, MAX_LIVE_ONLY_TYPE_REFUSALS)
                .map(([N]) => N)
            : [];
        let W = ridingRows
          ? {
              ...y,
              bytes: y.bytes + ridingRows.bytes,
            }
          : y;
        let eventPostTimeoutMs = computeEventPostTimeoutMs(W, {
          maxMs: this.maxEventPostTimeoutMs,
          minMs: v.some(isServableControlRequest)
            ? URGENT_EVENT_POST_TIMEOUT_MS
            : y.followsUrgent
              ? Math.min(URGENT_EVENT_POST_TIMEOUT_MS, this.maxEventPostTimeoutMs)
              : undefined,
        });
        this.reportDurableUpload(v, "sending");
        let z = this.actsOnSubscribersReports();
        let parseBody =
          z || this.onSubscribersReported !== undefined || ridingRows !== undefined || P.length > 0;
        let hasSubscribersReports = this.hasSubscribersReports;
        let R = [];
        for (let N of this.trackedFrameUploads("ackedAtMs"))
          if (v.some((q) => q.payload.uuid === N.uuid)) R.push(N.timing);
        for (let N of R)
          if (N.postedAtMs === undefined) {
            N.postedAtMs = performance.now();
            N.postedWallMs = Date.now();
          }
        let timing = this.firstTextFrameUpload?.timing;
        if (timing?.postedAtMs !== undefined && markTextDeltaRows(v, this.countedTextEvents))
          recordTextPost(timing, performance.now());
        let L;
        try {
          L = await this.request(
            "post",
            ridingRows ? EVENT_BATCH_PATH : "/worker/events",
            {
              ...this.uploadBody(v, y),
              ...(ridingRows && {
                worker_events: ridingRows.rows,
              }),
              ...(P.length > 0 && {
                delivery_updates: P.map((eventId) => ({
                  event_id: eventId,
                  status: "processed",
                })),
              }),
            },
            "client events",
            {
              timeout: eventPostTimeoutMs,
              parseBody,
              uploadAttempt: y.attempt,
            },
          );
        } catch (error) {
          ridingRows?.settle(false);
          throw error;
        } finally {
          if (P.length > 0) {
            let N = this.takeWaitingReceipts((q) => P.includes(q));
            if (!L?.ok || L.data?.delivery_updates_applied !== true) this.queueDeliveryAcks(N);
          }
        }
        let workerResults = L.ok ? L.data?.worker_results : undefined;
        let G = Array.isArray(workerResults) && workerResults.length === ridingRows?.rows.length;
        ridingRows?.settle(G);
        if (ridingRows !== undefined && L.ok) {
          this.routeOnlyFailures = 0;
          this.ridePauses = 0;
        }
        let status = L.ok ? 200 : L.status;
        let Q = ridingRows !== undefined && L.ok && isPlainObject(L.data) && workerResults === undefined;
        if (
          (ridingRows || P.length > 0) &&
          !L.ok &&
          (isClientErrorStatus(status) ||
            (ridingRows !== undefined && BATCH_UNSUPPORTED_STATUSES.has(status)))
        ) {
          L = await this.request(
            "post",
            "/worker/events",
            this.uploadBody(v, y),
            "client events (resent without worker_events and delivery_updates)",
            {
              timeout: eventPostTimeoutMs,
              parseBody,
              uploadAttempt: "resend",
            },
          );
          if (L.ok && status !== 413) {
            if (ridingRows !== undefined && isClientErrorStatus(status)) Q = true;
            else if (ridingRows !== undefined) this.noteRouteOnlyFailure(status);
            if (P.length > 0 && isClientErrorStatus(status)) {
              this.receiptsRideRefused = true;
              logForDiagnosticsNoPII("warn", "cli_ccr_receipts_ride_turned_off", {
                status,
              });
            }
          }
        } else if (ridingRows !== undefined) {
          if (!L.ok)
            this.failedRide = {
              status,
            };
        } else if (failedRide !== undefined && L.ok) this.noteRouteOnlyFailure(failedRide.status);
        if (Q) {
          this.ridesRefused = true;
          logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_turned_off", {
            status,
          });
        } else if (ridingRows && status === 200 && !G && !this.loggedRowsLeftOut) {
          this.loggedRowsLeftOut = true;
          logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_rows_left_out");
        }
        if (L.ok) {
          for (let q of R) if (q.ackedAtMs === undefined) q.ackedAtMs = performance.now();
          let taskBookends = detectTaskBookends(v);
          if (taskBookends) logFeatureOk("ccr_task_status_publish", taskBookends);
          this.noteBeatingEventsPostOk(v);
          this.reportDurableUpload(v, "accepted");
          this.noteToolCallRowsSettled("client_events", "stored", v);
          this.noteClientRowsSettled("stored", v);
          if (z && hasSubscribersReports === this.hasSubscribersReports)
            this.setHasSubscribers(L.data?.has_subscribers, "no_report");
          this.tellSubscribersReported(L.data?.has_subscribers);
          return;
        }
        this.reportDurableUpload(v, durableUploadOutcome(L.status));
        if (isClientErrorStatus(L.status)) {
          let filtered = v.filter((ee) => !ee.ephemeral);
          let q = v.length - filtered.length;
          let status = L.status;
          if (q > 0) {
            logForDebugging(
              `CCRClient: client event POST rejected (${L.status}) \u2014 dropping ${q} ephemeral event(s), retrying ${filtered.length} durable event(s)`,
              {
                level: "warn",
              },
            );
            logFeatureSad("ccr_partial_messages", "ephemeral_dropped_on_4xx", {
              status: L.status,
              count: q,
            });
            v.splice(0, v.length, ...filtered);
            logForDiagnosticsNoPII("warn", "cli_worker_events_4xx_ephemeral_dropped", {
              status: L.status,
              count: q,
            });
            if (filtered.length === 0) return;
            this.reportDurableUpload(filtered, "sending");
            let ee = await this.request(
              "post",
              "/worker/events",
              this.uploadBody(filtered, y),
              "client events (durable retry)",
              {
                timeout: eventPostTimeoutMs,
                uploadAttempt: "resend",
              },
            );
            if (ee.ok) {
              let taskBookends = detectTaskBookends(filtered);
              if (taskBookends) logFeatureOk("ccr_task_status_publish", taskBookends);
              this.noteBeatingEventsPostOk(filtered);
              this.reportDurableUpload(filtered, "accepted");
              this.noteToolCallRowsSettled("client_events", "stored", filtered);
              this.noteClientRowsSettled("stored", filtered);
              return;
            }
            this.reportDurableUpload(filtered, durableUploadOutcome(ee.status));
            if (!isClientErrorStatus(ee.status))
              throw ee.fetchFailed
                ? this.retrySmaller("client_events", filtered, y, eventPostTimeoutMs, {
                    bytes: filtered.reduce((acc, he) => acc + Buffer.byteLength(jsonStringify(he)), 0),
                  })
                : new ClientEventUploadError("client event POST failed", ee.retryAfterMs);
            status = ee.status;
          }
          if (filtered.length > 0) {
            this.droppedDurableEventBatches++;
            this.lastRateLimitKind = undefined;
            this.lastTaskList = undefined;
            this.noteToolCallRowsSettled("client_events", "dropped", filtered);
            this.noteClientRowsSettled("dropped", filtered);
            try {
              this.onDurableEventsDropped?.(filtered, status);
            } catch (error) {
              logForDebugging(
                `CCRClient: onDurableEventsDropped threw; batch still dropped: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              );
            }
          }
          logForDiagnosticsNoPII("warn", "cli_worker_events_4xx_dropped", {
            status,
            count: filtered.length,
            ...describeSingleRowForTelemetry(filtered),
          });
          let taskBookends = detectTaskBookends(filtered);
          if (taskBookends)
            logFeatureBad("ccr_task_status_publish", "status_events_4xx_dropped", taskBookends);
          return;
        }
        this.rowsSentAgainStepAside(v);
        if (v.length === 0) return;
        if (L.fetchFailed) throw this.retrySmaller("client_events", v, y, eventPostTimeoutMs);
        if (status === undefined && L.reason === "no_auth_headers")
          throw new ClientEventBatchRejectedError("client event POST not sent");
        throw new ClientEventUploadError("client event POST failed", L.retryAfterMs);
      }),
      baseDelayMs: 500,
      maxDelayMs: 30000,
      jitterMs: 500,
      onHoldRelease: this.logUploadHoldEnd.bind(this, "client_events"),
      onDrained: this.logUploadDrain.bind(this, "client_events"),
      onIdle: () => {
        this.giveBackRidingRows();
        if (this.receiptsRide) this.sendWaitingReceipts(isProcessedReceipt);
      },
    });
    let internalEventUploader = s?.internalEventUploader;
    this.internalEventUploader = new ClientEventUploader({
      maxBatchSize: 100,
      maxBatchBytes: () =>
        internalEventUploader?.maxBatchBytes ??
        Math.min(10 * ONE_MIB, this.workerSocket?.maxBatchBytes() ?? 1 / 0),
      maxQueueSize: 200,
      maxConsecutiveFailures: internalEventUploader?.maxConsecutiveFailures,
      onBatchDropped: (count, consecutiveFailures) => {
        this.droppedInternalEventBatches++;
        logForDiagnosticsNoPII("warn", "cli_worker_internal_events_give_up_dropped", {
          count,
          consecutive_failures: consecutiveFailures,
        });
        logEvent("tengu_ccr_internal_events_dropped", {
          reason: lit("give_up"),
          count,
          consecutive_failures: consecutiveFailures,
        });
      },
      send: async (v, y) => {
        let O = this.dropOrphanedHandedOffLines(v);
        if (O > 0) {
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_handoff_orphans_dropped", {
            count: O,
          });
          logEvent("tengu_ccr_internal_events_dropped", {
            reason: lit("handoff_orphan"),
            count: O,
          });
          if (v.length === 0) return;
        }
        let startTime = performance.now();
        let eventPostTimeoutMs = computeEventPostTimeoutMs(y, {
          maxMs: this.maxEventPostTimeoutMs,
          minMs: internalEventUploader?.requestTimeoutMs,
        });
        let S = this.offerToEventsPost(v, y);
        let P =
          S && (await S)
            ? {
                ok: true,
              }
            : await this.request(
                "post",
                "/worker/internal-events",
                this.uploadBody(v, y),
                "internal events",
                {
                  timeout: eventPostTimeoutMs,
                  uploadAttempt: y.attempt,
                },
              );
        this.markInternalEventPostWatch((W) => W.noteAttempt(v, startTime, P.ok));
        if (P.ok) {
          this.noteToolCallRowsSettled("internal_events", "stored", v);
          Promise.resolve()
            .then(() => this.onInternalBatchAcked?.(v))
            .catch(() => {});
          return;
        }
        if (isClientErrorStatus(P.status) && O === 0 && y.mayResendInTwo()) {
          logEvent("tengu_ccr_internal_events_refused_will_split", {
            count: v.length,
            status: P.status,
          });
          throw new ClientEventResendSoonError();
        }
        if (isClientErrorStatus(P.status)) {
          this.droppedInternalEventBatches++;
          this.noteRefusedInternalEvents(v);
          this.noteToolCallRowsSettled("internal_events", "dropped", v);
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_4xx_dropped", {
            status: P.status,
            count: v.length,
            ...describeSingleRowForTelemetry(v),
          });
          logEvent("tengu_ccr_internal_events_dropped", {
            reason: lit("4xx"),
            count: v.length,
            status: P.status,
          });
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
        if (P.fetchFailed) throw this.retrySmaller("internal_events", v, y, eventPostTimeoutMs);
        if (P.reason === "no_auth_headers")
          throw new ClientEventBatchRejectedError("internal event POST not sent");
        throw new ClientEventUploadError(
          "internal event POST failed",
          P.nonOriginRefusal ? MAX_RETRY_DELAY_MS : P.retryAfterMs,
        );
      },
      baseDelayMs: 500,
      maxDelayMs: MAX_RETRY_DELAY_MS,
      jitterMs: 500,
      holdMaxItems: 50,
      gatherTick: true,
      onHoldRelease: this.logUploadHoldEnd.bind(this, "internal_events"),
      onDrained: this.logUploadDrain.bind(this, "internal_events"),
    });
    this.deliveryUploader = new ClientEventUploader({
      maxBatchSize: 64,
      maxQueueSize: 64,
      send: async (batch) => {
        let result = await this.request(
          "post",
          "/worker/events/delivery",
          {
            worker_epoch: this.workerEpoch,
            updates: batch.map((O) => ({
              event_id: O.eventId,
              status: O.status,
            })),
          },
          "delivery batch",
        );
        if (result.ok) return;
        if (isClientErrorStatus(result.status)) {
          logForDiagnosticsNoPII("warn", "cli_worker_delivery_4xx_dropped", {
            status: result.status,
            count: batch.length,
          });
          this.droppedDeliveryAckBatches++;
          return;
        }
        throw new ClientEventUploadError("delivery POST failed", result.retryAfterMs);
      },
      baseDelayMs: 500,
      maxDelayMs: 30000,
      jitterMs: 500,
    });
    this.setStreamEventFlushIntervalMs(s?.streamEventFlushIntervalMs);
    this.setStreamEventFirstFlushMs(s?.streamEventFirstFlushMs);
    this.setToolInputFlushMs(s?.toolInputFlushMs);
    this.setNoSubscriberStreamEventFlushIntervalMs(s?.noSubscriberStreamEventFlushIntervalMs);
    this.setNoSubscriberUploadHoldMs(s?.noSubscriberUploadHoldMs);
    this.setDropUnwatchedStreamEvents(s?.dropUnwatchedStreamEvents);
    e.setOnEvent((v) => {
      if (this.processExiting() && isUserPayload(v)) return;
      this.noteSettingsRequest(v.payload);
      let subtype =
        isPlainObject(v.payload) && v.payload.type === "control_request" && isPlainObject(v.payload.request)
          ? v.payload.request.subtype
          : undefined;
      if (HOUSEKEEPING_CONTROL_SUBTYPES.has(subtype)) {
        for (let O of [v.event_id, v.payload.uuid])
          if (typeof O === "string") {
            this.housekeepingRequestIds.add(O);
            evictOldestIfFull(this.housekeepingRequestIds);
          }
      }
      this.reportDelivery(
        v.event_id,
        "received",
        isPlainObject(v.payload) && v.payload.type === "user" && typeof v.payload.uuid === "string"
          ? v.payload.uuid
          : undefined,
        {
          controlTraffic: isRelayableControlFrame(v.payload),
          settingsRequest: FLAG_CONTROL_SUBTYPES.has(subtype),
        },
      );
    });
    e.setOnHeartbeatProbe(() => {
      this.setHasSubscribers(undefined, "reset");
      this.heartbeatNow("probe");
    });
    e.setOnCheckpointRequest(() => this.checkpointForViewer("watcher"));
    e.setOnReconnected(() => {
      this.resyncAfterReconnect();
      s?.onStreamReconnected?.();
      if (this.holdsAcrossModelCalls()) this.checkpointForViewer("reconnect");
    });
    this.unsubscribeIdleTracker = this.beatOnReactivation
      ? this.idleTracker?.onActivity(() => this.sendReactivationBeat())
      : undefined;
  }
  maxAdvisedIntervalFor(e) {
    return e
      ? Math.floor(MAX_TIMER_DELAY_MS / (1 + this.heartbeatJitterFraction))
      : DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS;
  }
  setFeatureGatedOptions({
    advertiseHeartbeatProbeSupport,
    beatOnStaleReconnect,
    beatOnReactivation,
    skipRedundantHeartbeats,
  }) {
    this.advertiseHeartbeatProbeSupport = advertiseHeartbeatProbeSupport;
    this.maxAdvisedIntervalMs = this.maxAdvisedIntervalFor(advertiseHeartbeatProbeSupport);
    this.beatOnStaleReconnect = beatOnStaleReconnect;
    this.skipRedundantHeartbeats = skipRedundantHeartbeats;
    let h = beatOnReactivation && this.idleTracker !== undefined;
    if (h !== this.beatOnReactivation) {
      this.beatOnReactivation = h;
      this.unsubscribeIdleTracker?.();
      this.unsubscribeIdleTracker =
        h && !this.closed ? this.idleTracker?.onActivity(() => this.sendReactivationBeat()) : undefined;
    }
  }
  async initialize(e) {
    let now = Date.now();
    if (Object.keys(this.getAuthHeaders()).length === 0) throw new CCRInitError("no_auth_headers");
    if (e === undefined) e = workerEpochFromEnv();
    if (isNaN(e)) throw new CCRInitError("missing_epoch");
    this.workerEpoch = e;
    if (!this.flushPolicy) this.takeUpFlushPolicy(undefined);
    let abortController = new AbortController();
    let r = false;
    let abortController_2 = new AbortController();
    let workerState = this.getWorkerState(
      "worker_state",
      false,
      AbortSignal.any([this.closeAbort.signal, abortController.signal]),
    );
    let winner = await Promise.race([
      workerState.then(
        (I) => {
          r = true;
          return I.metadata;
        },
        () => {
          r = true;
          return {
            external: null,
            internal: null,
            readFailed: true,
          };
        },
      ),
      sleep(this.initStateGetOrderingBoundMs, abortController_2.signal).then(() => "pending"),
    ]);
    abortController_2.abort();
    let y = this.reportParkAtInit ? resolveWorkerRequiresActionState(winner) : undefined;
    let metadataNeverSent = this.followsServedPolicy ? this.flushPolicy?.metadataNeverSent : undefined;
    let C = {
      ...this.initExternalMetadata,
      ...Object.fromEntries(Array.from(metadataNeverSent ?? [], (I) => [I, null])),
    };
    let U = {
      worker_status: "idle",
      worker_epoch: this.workerEpoch,
      external_metadata: {
        ...C,
        task_summary: null,
      },
    };
    let S =
      y === undefined
        ? {
            worker_status: this.initialWorkerStatus,
            worker_epoch: this.workerEpoch,
            external_metadata: {
              ...C,
              pending_action: null,
              pending_actions: null,
              task_summary: null,
            },
          }
        : y.status === "requires_action"
          ? {
              ...U,
              worker_status: "requires_action",
              requires_action_details: y.details,
            }
          : U;
    let P = {
      ok: false,
    };
    let W = new Set();
    let x = 10;
    let z = 0;
    for (let j = 1; j <= x; j++) {
      if (this.closed) break;
      z = j;
      P = await this.request("put", "/worker", S, "PUT worker (init)");
      if (P.ok || this.closed) break;
      if (P.reason) W.add(P.reason);
      this.onDiagnostic?.(
        `PUT /worker failed (${P.reason ?? "unknown"}) attempt=${j}/${x}, ${Math.round((Date.now() - now) / 1000)}s elapsed`,
        "warn",
        "worker_registration_attempt_failed",
      );
      if (isClientErrorStatus(P.status)) {
        if (y?.status === "requires_action") {
          y = {
            status: "idle",
            reason: "park_rejected",
          };
          S = U;
          j--;
          continue;
        }
        break;
      }
      if (j < x) {
        let G = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
        await sleep(G);
      }
    }
    if (!P.ok) {
      if (!this.closed) {
        logForDiagnosticsNoPII("error", "cli_worker_init_put_retries_exhausted");
        this.onDiagnostic?.(
          `PUT /worker retries exhausted: ${z} attempts over ${Math.round((Date.now() - now) / 1000)}s, errors=[${[...W].join(",") || "unknown"}]`,
          "warn",
          "worker_registration_gave_up",
        );
      }
      throw new CCRInitError("worker_register_failed", P.status);
    }
    this.currentState = y?.status ?? this.initialWorkerStatus;
    this.startReportsWaitUntilMs =
      this.currentState === "idle" ? performance.now() + this.startReportsMaxWaitMs : 0;
    let { worker_epoch: workerEpoch, ...Y } = S;
    this.workerState.remember(Y);
    this.applyUploadHold("idle");
    this.parkReportedAtInitRequestId = y?.status === "requires_action" ? y.requestId : undefined;
    this.startHeartbeat();
    if (!this.closed) {
      setActivityCallback(() => {
        this.writeEvent({
          type: "keep_alive",
        });
      });
      let keepAliveAtWorkStart = this.keepAliveAtWorkStart;
      if (keepAliveAtWorkStart)
        this.stopWorkStartKeepAlive = onWorkStarted(() => {
          try {
            if (
              Date.now() - this.lastEventsAnswerOrPulseAtMs >= EVENTS_PULSE_INTERVAL_MS &&
              keepAliveAtWorkStart()
            ) {
              this.lastEventsAnswerOrPulseAtMs = Date.now();
              this.writeEvent({
                type: "keep_alive",
              });
            }
          } catch (error) {
            logError(error);
          }
        });
      if (this.gatesToolCalls) this.stopToolCallGate = setBridgeSessionListener((G) => this.gateToolCall(G));
    }
    logForDebugging(`CCRClient: initialized, epoch=${this.workerEpoch}`);
    logForDiagnosticsNoPII("info", "cli_worker_lifecycle_initialized", {
      epoch: this.workerEpoch,
      duration_ms: Date.now() - now,
      reported_status: this.currentState,
    });
    recordPhase("worker_init_ms", Date.now() - now, now - performance.timeOrigin);
    if (y)
      logEvent("tengu_ccr_init_park_report", {
        reported: fromEnum(y.status),
        reason: fromEnum(y.reason),
      });
    let R = this.stateReadEndsAtRegistration && !r;
    if (R) abortController.abort();
    let { metadata, durationMs } = await workerState;
    if (this.stateReadEndsAtRegistration && metadata.readFailed)
      logForDebugging(
        "CCRClient: GET /worker had not succeeded when the worker registered; continuing without the stored worker state",
        {
          level: "warn",
        },
      );
    this.clientRowsOwed.workerRecordRead(metadata, new Date());
    if (this.clientRowsOwed.spansGivenUpAtStart > 0)
      logFeatureBad("ccr_client_rows_owed", "gave_up_after_tries", {
        spans: this.clientRowsOwed.spansGivenUpAtStart,
      });
    this.sessionModelTurnStored = metadata.internal?.model_turn_stored === true;
    if (!metadata.readFailed)
      this.recordAtStart = {
        ...metadata.external,
        ...C,
      };
    if (!this.closed)
      logForDiagnosticsNoPII("info", "cli_worker_state_restored", {
        duration_ms: durationMs,
        had_state: metadata.external !== null || metadata.internal !== null,
        read_failed: metadata.readFailed === true,
        read_abandoned_at_registration: R && metadata.readFailed === true,
      });
    return y
      ? {
          ...metadata,
          initParkReport: notifySessionStateChanged(y.status, metadata),
        }
      : metadata;
  }
  async getWorkerState(e = "worker_state", n = false, signal = this.closeAbort.signal) {
    let startMs = Date.now();
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0)
      return {
        metadata: {
          external: null,
          internal: null,
          readFailed: true,
        },
        projectsAssertion: undefined,
        durationMs: 0,
      };
    let w = await CCRClient.getWithRetry(
      this.readSource,
      `${this.sessionBaseUrl}/worker${hearthQuerySuffix(n)}`,
      authHeaders,
      e,
      undefined,
      undefined,
      {
        signal,
      },
    );
    return {
      metadata: {
        external: w?.worker?.external_metadata ?? null,
        internal: w?.worker?.internal_metadata ?? null,
        ...(w === null && {
          readFailed: true,
        }),
      },
      projectsAssertion: isHearthRequest(w),
      durationMs: Date.now() - startMs,
    };
  }
  get currentWorkerEpoch() {
    return this.workerEpoch;
  }
  readOwnClientEvent(e) {
    return CCRClient.readOwnClientEventFrom(this.readSource, e);
  }
  static async readOwnClientEventFrom(e, n) {
    let s = `${e.sessionBaseUrl}/worker/events/${encodeURIComponent(n.toLowerCase())}`;
    let r = {
      kind: "unavailable",
      why: "network",
    };
    for (let j = 1; j <= WORKER_STATE_MAX_ATTEMPTS; j++) {
      let w;
      try {
        w = e.getAuthHeaders();
      } catch {
        return {
          kind: "unavailable",
          why: "no_auth_headers",
        };
      }
      if (Object.keys(w).length === 0)
        return {
          kind: "unavailable",
          why: "no_auth_headers",
        };
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
            ...getProxyFetchOptions({
              url: s,
            }),
          },
          e.ownConnectionPool,
        );
      } catch {
        r = {
          kind: "unavailable",
          why: "network",
        };
      }
      if (v !== undefined) {
        let y = await v.json().catch(() => {
          return;
        });
        if (v.ok) return parseDeliveryEvent(y, n);
        if (v.status === 404 && isClientEventNotFoundError(y))
          return {
            kind: "absent",
          };
        r = {
          kind: "unavailable",
          why: describeUploadFailure(v.status),
        };
        if (v.status < 500 || v.status === 501) return r;
      }
      if (j < WORKER_STATE_MAX_ATTEMPTS)
        await sleep(Math.min(500 * 2 ** (j - 1), 4000) + Math.random() * 500);
    }
    return r;
  }
  async readProjectsBinding() {
    let { metadata, projectsAssertion } = await this.getWorkerState("projects_binding", true);
    return metadata.readFailed
      ? {
          read: false,
        }
      : {
          read: true,
          assertion: projectsAssertion,
        };
  }
  async readWorkerState() {
    return (await this.getWorkerState("worker_state_reread")).metadata;
  }
  static async readProjectsBindingFor(e, getAuthHeaders) {
    let s = convertWsUrlToPostUrl(e, getAuthHeaders);
    if (Object.keys(getAuthHeaders()).length === 0)
      return {
        read: false,
      };
    let r = await CCRClient.getWithRetry(
      s,
      `${s.sessionBaseUrl}/worker${hearthQuerySuffix(true)}`,
      getAuthHeaders(),
      "projects_binding",
    );
    return r === null
      ? {
          read: false,
        }
      : {
          read: true,
          assertion: isHearthRequest(r),
        };
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
      timeout = MIN_EVENT_POST_TIMEOUT_MS,
      parseBody = false,
      countTowardEscalation = true,
      signal,
      onLateSocketAnswer,
      uploadAttempt,
    },
  ) {
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0)
      return {
        ok: false,
        reason: "no_auth_headers",
      };
    let S = `${this.sessionBaseUrl}${n}`;
    let P = signal
      ? createCombinedAbortSignal(signal, {
          timeoutMs: timeout,
          refTimer: true,
        })
      : undefined;
    let W = false;
    let Authorization = authHeaders.Authorization;
    try {
      let z = jsonStringify(s);
      let startTime = performance.now();
      let Y = signal
        ? undefined
        : n === "/worker/heartbeat"
          ? this.workerSocket?.beat(z, timeout, (Q) => onLateSocketAnswer?.(Q))
          : this.workerSocket?.carry(n, z, timeout);
      let R = Y && (await Y);
      let B = R;
      if (!B) {
        if (Y && n === "/worker/heartbeat" && this.closed)
          return {
            ok: false,
            reason: "closed",
          };
        let Q = {
          method: e.toUpperCase(),
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "anthropic-client-platform": getClientPlatform(),
            "User-Agent": claudeCodeUserAgent(),
            ...(uploadAttempt !== undefined && {
              [X_CCR_UPLOAD_ATTEMPT]: uploadAttempt,
            }),
          },
          body: z,
          signal: P?.signal ?? AbortSignal.timeout(timeout),
          ...getProxyFetchOptions({
            url: S,
          }),
        };
        if (Y) {
          let N = {};
          try {
            N = this.getAuthHeaders();
          } catch (error) {
            logForDebugging(
              `CCRClient: could not read credentials again for a request the worker socket handed to POST: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          }
          if (Object.keys(N).length > 0) {
            let headers = Q.headers;
            for (let key of Object.keys(authHeaders)) delete headers[key];
            Object.assign(headers, N);
            Authorization = N.Authorization;
          }
          Q.signal = AbortSignal.timeout(
            n === "/worker/heartbeat" ? Math.max(0, timeout - (performance.now() - startTime)) : timeout,
          );
        }
        Object.assign(Q.headers, this.tickets.headersFor(Authorization));
        B = this.gzipRequestBodyFetch
          ? await this.gzipRequestBodyFetch(S, Q, (N) => proxyAwareFetch(S, N, this.ownConnectionPool))
          : await proxyAwareFetch(S, Q, this.ownConnectionPool);
      }
      W = true;
      if (!R) this.tickets.note(Authorization, B);
      if (B.ok) {
        this.consecutiveAuthFailures = 0;
        this.consecutiveNotFound = 0;
        this.reportNonOriginRun("onCleared", ENDPOINT_CATEGORIES[n]);
        this.nonOriginRuns.delete(ENDPOINT_CATEGORIES[n]);
        for (let nonOriginRun of this.nonOriginRuns.values()) nonOriginRun.othersPassed = true;
        if (parseBody)
          try {
            return {
              ok: true,
              data: await B.json(),
            };
          } catch {
            return {
              ok: true,
            };
          }
        await drainResponseBody(B);
        return {
          ok: true,
        };
      }
      let L;
      if (B.status === 409 && !this.closed) L = await readConflictReason(B);
      else await drainResponseBody(B);
      if (this.closed)
        return {
          ok: false,
          status: B.status,
          reason: `http_${B.status}`,
        };
      if (B.status === 409) this.handleEpochMismatch(L);
      if (B.status === 404 && countTowardEscalation && n !== EVENT_BATCH_PATH) {
        this.consecutiveNotFound++;
        if (this.consecutiveNotFound >= MAX_CONSECUTIVE_NOT_FOUND) {
          logForDebugging(
            `CCRClient: ${this.consecutiveNotFound} consecutive 404s \u2014 session gone, exiting`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("error", "cli_worker_session_not_found", undefined, this.lastLineWhen);
          this.onDiagnostic?.(
            `${this.consecutiveNotFound} consecutive 404s on ${n} \u2014 session gone, exiting`,
            "warn",
            "session_not_found",
          );
          this.escalateEpochMismatch("session_not_found");
        }
      }
      let I = B.status !== 403 ? undefined : R ? "origin" : readRequestIdSource((Q) => B.headers.get(Q));
      let nonOrigin403Transient = this.nonOrigin403Transient;
      let X = nonOrigin403Transient !== false && isNonOriginSource(I);
      if (X && typeof nonOrigin403Transient === "object") {
        let Q = ENDPOINT_CATEGORIES[n];
        let startTime = performance.now();
        let q = this.nonOriginRuns.get(Q) ?? {
          sinceMs: startTime,
          refusals: 0,
          windowsSpent: 0,
          othersPassed: false,
        };
        this.nonOriginRuns.set(Q, q);
        q.refusals++;
        X = startTime - q.sinceMs < nonOrigin403Transient.windowMs;
        if (X)
          try {
            nonOrigin403Transient.onRefused(Q);
          } catch (error) {
            logForDebugging(`CCRClient: onRefused threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        else if (startTime - q.sinceMs >= (q.windowsSpent + 1) * nonOrigin403Transient.windowMs) {
          q.windowsSpent++;
          this.reportNonOriginRun("onWindowSpent", Q);
        }
      }
      if (B.status === 401 || B.status === 403) {
        let sessionIngressAuthToken = getSessionIngressAuthToken();
        let N = sessionIngressAuthToken ? decodeJwtExpiry(sessionIngressAuthToken) : null;
        if (N !== null && N * 1000 < Date.now()) {
          logForDebugging(
            `CCRClient: session_token expired (exp=${new Date(N * 1000).toISOString()}) \u2014 no refresh was delivered, exiting`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII(
            "error",
            "cli_worker_token_expired_no_refresh",
            undefined,
            this.lastLineWhen,
          );
          this.onDiagnostic?.(
            `session_token expired (exp=${new Date(N * 1000).toISOString()}) \u2014 no refresh delivered, exiting`,
            "warn",
            "token_expired",
          );
          this.escalateEpochMismatch("token_expired");
        }
        if (countTowardEscalation && !X) {
          this.consecutiveAuthFailures++;
          if (this.consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
            logForDebugging(
              `CCRClient: ${this.consecutiveAuthFailures} consecutive auth failures with a valid-looking token \u2014 server-side auth unrecoverable, exiting`,
              {
                level: "error",
              },
            );
            logForDiagnosticsNoPII(
              "error",
              "cli_worker_auth_failures_exhausted",
              undefined,
              this.lastLineWhen,
            );
            this.onDiagnostic?.(
              `${this.consecutiveAuthFailures} consecutive auth failures (HTTP ${B.status}) with valid-looking token \u2014 exiting`,
              "warn",
              "auth_exhausted",
            );
            this.escalateEpochMismatch("auth_exhausted");
          }
        }
      }
      logForDebugging(`CCRClient: ${r} returned ${B.status}`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
        method: e,
        path: n,
        status: B.status,
        ...(I !== undefined && {
          source: I,
        }),
      });
      if (B.status === 429) {
        let Q = B.headers.get("retry-after");
        let N = Q ? parseInt(Q, 10) : NaN;
        if (!isNaN(N) && N >= 0)
          return {
            ok: false,
            retryAfterMs: N * 1000,
            status: B.status,
            reason: `http_${B.status}`,
          };
      }
      return {
        ok: false,
        status: B.status,
        reason: `http_${B.status}`,
        ...(X && {
          nonOriginRefusal: X,
        }),
      };
    } catch (error) {
      logForDebugging(`CCRClient: ${r} failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_worker_request_error", {
        method: e,
        path: n,
        error_code: mergeClients(error),
      });
      let reason = `fetch_failed:${mergeClients(error)}`;
      return W
        ? {
            ok: false,
            reason,
          }
        : {
            ok: false,
            fetchFailed: true,
            reason,
          };
    } finally {
      P?.cleanup();
    }
  }
  reportNonOriginRun(e, n) {
    let s = this.nonOriginRuns.get(n);
    if (s === undefined || typeof this.nonOrigin403Transient !== "object") return;
    let rounded = Math.round(performance.now() - s.sinceMs);
    let { unsentClientEvents, unsentInternalEvents } = this.uploadBacklog();
    logForDebugging(
      `CCRClient: ${n} ${e === "onCleared" ? "accepted again" : "still refused"} after ${rounded}ms of non-origin 403s (${s.refusals} refusals)`,
      {
        level: "warn",
      },
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
      logForDebugging(`CCRClient: ${e} threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  reportState(e, n) {
    if (e === this.currentState && !n) return;
    let parkReportedAtInitRequestId = this.parkReportedAtInitRequestId;
    this.parkReportedAtInitRequestId = undefined;
    if (
      parkReportedAtInitRequestId !== undefined &&
      e === "requires_action" &&
      this.currentState === "requires_action" &&
      requestIdOf(n) === parkReportedAtInitRequestId
    )
      return;
    if (e === "idle") {
      this.openPickupBarriers(this.pickupBarriers.length);
      this.openTurn();
    }
    this.currentState = e;
    this.startReportsWaitUntilMs = 0;
    this.workerState.enqueue({
      worker_status: e,
      requires_action_details: n ? buildRequiresActionDetails(n) : null,
      internal_metadata: {
        reply_degraded: isHearthDegraded(),
        ...this.clientRowsOwed.stateReported(e, new Date(), this.clientRowsAreGuarded()),
      },
      ...(this.autocompactStateStored !== undefined && {
        external_metadata: {
          autocompact_state: this.autocompactStateStored,
        },
      }),
    });
    this.autocompactStateStored = undefined;
    this.applyUploadHold(e === "running" ? "idle" : e);
  }
  reportMetadata(e) {
    let metadataNeverSent = this.flushPolicy?.metadataNeverSent;
    let s = this.withoutRepeatsOfRecord(
      metadataNeverSent?.size && this.followsServedPolicy
        ? pickByHelper(e, (r, h) => r === null || !metadataNeverSent.has(h))
        : e,
    );
    if (s !== e && Object.keys(s).length === 0) return;
    this.workerState.enqueue({
      external_metadata: blockedToNeedInput(s),
    });
  }
  withoutRepeatsOfRecord(e) {
    let filtered = Object.keys(e).filter((key) => {
      if (!REPORTABLE_METADATA_KEYS.has(key) || this.reportedKeys.has(key)) return false;
      this.reportedKeys.add(key);
      return (
        this.recordAtStart !== undefined && En(e[key] ?? undefined, this.recordAtStart[key] ?? undefined)
      );
    });
    return filtered.length > 0 ? pickByHelper(e, (s, r) => !filtered.includes(r)) : e;
  }
  reportInternalMetadata(internalMetadata) {
    this.workerState.enqueue({
      internal_metadata: internalMetadata,
    });
  }
  handleEpochMismatch(e) {
    let n = e ?? "epoch_conflict";
    let s = e ?? "unattributed";
    logForDebugging(`CCRClient: Epoch mismatch (409, reason=${s}), shutting down`, {
      level: "error",
    });
    logForDiagnosticsNoPII(
      "error",
      n === "epoch_stale"
        ? "cli_worker_epoch_stale"
        : n === "session_not_active"
          ? "cli_worker_session_not_active"
          : "cli_worker_epoch_mismatch",
      {
        reason: s,
      },
      this.lastLineWhen,
    );
    let r =
      n === "epoch_stale"
        ? "stale registration (no live successor)"
        : n === "session_not_active"
          ? "session archived or no longer active"
          : n === "superseded_by_worker"
            ? "superseded by a newer worker"
            : "unattributed conflict, treated as superseded";
    this.onDiagnostic?.(
      `worker epoch mismatch (409) reason=${s} epoch=${this.workerEpoch} \u2014 ${r}, exiting`,
      "warn",
      n,
    );
    this.escalateEpochMismatch(n);
  }
  escalateEpochMismatch(e) {
    this.lastEpochMismatchCause = e;
    this.epochMismatchCount++;
    this.epochSuperseded = true;
    return this.onEpochMismatch(e);
  }
  startHeartbeat() {
    this.stopHeartbeat();
    if (this.closed) return;
    let e = () => {
      let jitter = this.heartbeatIntervalMs * this.heartbeatJitterFraction * (2 * Math.random() - 1);
      this.heartbeatTimer = setTimeout(n, this.heartbeatIntervalMs + jitter);
    };
    let n = () => {
      let lastCadenceTickAtMs = this.lastCadenceTickAtMs;
      this.lastCadenceTickAtMs = Date.now();
      if (this.canSkipCadenceBeat(lastCadenceTickAtMs)) {
        this.skippedPreviousCadenceBeat = true;
        this.idleTracker?.sampleIdleSeconds();
        logForDebugging("CCRClient: Heartbeat skipped (events beat)");
      } else this.sendHeartbeat();
      if (this.heartbeatTimer === null) return;
      if (
        this.holdsAcrossModelCalls() &&
        this.turnHold === "whole" &&
        env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
        hasActiveWork() &&
        this.lastCadenceTickAtMs - this.lastEventsAnswerOrPulseAtMs >= EVENTS_PULSE_INTERVAL_MS
      ) {
        this.lastEventsAnswerOrPulseAtMs = this.lastCadenceTickAtMs;
        this.writeEvent({
          type: "keep_alive",
        });
      }
      e();
    };
    this.lastCadenceTickAtMs = Date.now();
    e();
  }
  noteBeatingEventsPostOk(e) {
    this.lastEventsAnswerOrPulseAtMs = Date.now();
    if (!this.workerSocket?.isTransport() && e.some((n) => !n.ephemeral))
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
      return false;
    let s = n * 2;
    return this.clampToTokenLifetime(s) >= s;
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  clearProbeBeatTimer() {
    if (this.probeBeatTimer) {
      clearTimeout(this.probeBeatTimer);
      this.probeBeatTimer = null;
    }
  }
  async releaseLease({ drained = false } = {}) {
    if (this.workerEpoch <= 0 || this.epochSuperseded) return;
    try {
      let n = await this.request(
        "post",
        "/worker/heartbeat",
        {
          session_id: this.sessionId,
          worker_epoch: this.workerEpoch,
          release_lease: true,
          ...(drained && {
            drained: true,
          }),
        },
        "POST worker/heartbeat (release)",
        {
          timeout: SHUTDOWN_REQUEST_TIMEOUT_MS,
          countTowardEscalation: false,
        },
      );
      if (n.ok) logFeatureOk("ccr_worker_lease_release");
      else if (n.status !== 409)
        logFeatureSad(
          "ccr_worker_lease_release",
          n.status !== undefined ? `http_${n.status}` : "send_failed",
        );
    } catch (error) {
      logError(error);
      logFeatureSad("ccr_worker_lease_release", "send_threw");
    }
  }
  sendGoodbye() {
    if (this.workerEpoch <= 0 || this.epochSuperseded) return;
    if (this.currentState === "running") {
      logForDiagnosticsNoPII("info", "cli_worker_goodbye_skipped_mid_turn");
      this.leftMidTurn = true;
      return;
    }
    this.goodbyeFlushed = this.request(
      "put",
      "/worker",
      {
        worker_epoch: this.workerEpoch,
        connection_status: "disconnected",
      },
      "PUT worker (goodbye)",
      {
        timeout: SHUTDOWN_REQUEST_TIMEOUT_MS,
        countTowardEscalation: false,
      },
    )
      .then((e) => {
        if (e.ok) logFeatureOk("ccr_worker_goodbye");
        else if (e.status !== 409)
          logFeatureSad("ccr_worker_goodbye", e.status !== undefined ? `http_${e.status}` : "send_failed");
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
      this.pendingForcedBeat = true;
      return;
    }
    let s = Date.now() - this.lastHeartbeatSentAtMs;
    if (s < this.probeBeatSpacingMs) {
      if (this.probeBeatTimer) return;
      this.probeBeatTimer = setTimeout(() => {
        this.probeBeatTimer = null;
        this.refireForcedBeat();
      }, this.probeBeatSpacingMs - s);
      return;
    }
    let pendingBeatTrigger = this.pendingBeatTrigger ?? e;
    this.pendingBeatTrigger = null;
    this.clearProbeBeatTimer();
    this.sendHeartbeat(pendingBeatTrigger);
  }
  refireForcedBeat() {
    let pendingBeatTrigger = this.pendingBeatTrigger ?? "probe";
    if (pendingBeatTrigger === "resync_stale" && !this.staleReconnectBeatWanted()) {
      this.pendingBeatTrigger = null;
      this.clearProbeBeatTimer();
      return;
    }
    if (pendingBeatTrigger === "reactivate") {
      this.restoreReactivationArm();
      if (!this.reactivationBeatWanted()) {
        this.pendingBeatTrigger = null;
        this.clearProbeBeatTimer();
        return;
      }
      this.reactivationBeatArmed = false;
    }
    this.heartbeatNow(pendingBeatTrigger);
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
    if (this.beatOnReactivation && e !== undefined && e >= n) this.reactivationBeatArmed = true;
  }
  sendReactivationBeat() {
    if (!this.reactivationBeatWanted()) return;
    this.reactivationBeatArmed = false;
    this.heartbeatNow("reactivate");
  }
  isIdleAdvised() {
    return this.advertiseHeartbeatProbeSupport && this.idleGrantLatched;
  }
  applyShorterIntervalNow(e) {
    if (e >= this.heartbeatIntervalMs) return;
    this.heartbeatIntervalMs = e;
    if (this.heartbeatTimer !== null) this.startHeartbeat();
  }
  clampToTokenLifetime(e) {
    if (!this.advertiseHeartbeatProbeSupport || !this.adoptRefreshedAuth) return e;
    let sessionIngressAuthToken = getSessionIngressAuthToken();
    let s = sessionIngressAuthToken ? decodeJwtExpiry(sessionIngressAuthToken) : null;
    if (s === null) return e;
    let r = s * 1000 - Date.now() - TOKEN_REFRESH_LEAD_MS;
    if (r >= e) return e;
    return Math.max(MIN_HEARTBEAT_INTERVAL_MS, r);
  }
  reclampCurrentIntervalToTokenLifetime() {
    let e = this.clampToTokenLifetime(this.heartbeatIntervalMs);
    if (e < this.heartbeatIntervalMs) {
      logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
        from_ms: this.heartbeatIntervalMs,
        to_ms: e,
      });
      this.applyShorterIntervalNow(e);
    }
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
    if (!this.beatOnStaleReconnect || this.heartbeatIntervalMs <= this.seedHeartbeatIntervalMs) return false;
    let now = Date.now();
    if (now - this.lastHeartbeatSuccessAtMs <= this.heartbeatIntervalMs * HEARTBEAT_STALE_FACTOR)
      return false;
    return now - this.lastHeartbeat429AtMs > this.heartbeatIntervalMs;
  }
  resetHeartbeatStreak() {
    this.consecutiveHeartbeatFailures = 0;
    this.heartbeatLostFiredForStreak = false;
  }
  async sendHeartbeat(e) {
    if (this.closed) {
      this.stopHeartbeat();
      return;
    }
    this.workerState.sendWaiting(this.followsServedPolicy ? this.flushPolicy?.metadataMaxWaitMs : 0);
    if (this.heartbeatInFlight) return;
    this.heartbeatInFlight = true;
    this.lastHeartbeatSentAtMs = Date.now();
    let lastHeartbeatSentAtMs = this.lastHeartbeatSentAtMs;
    let s = ++this.heartbeatsSent;
    let r = {
      succeededLateOnSocket: false,
    };
    this.skippedPreviousCadenceBeat = false;
    if (e === "resync_stale")
      logForDiagnosticsNoPII("info", "cli_heartbeat_reconnect_stale_beat", {
        gap_ms: this.lastHeartbeatSentAtMs - this.lastHeartbeatSuccessAtMs,
        interval_ms: this.heartbeatIntervalMs,
      });
    try {
      if (e === "reactivate")
        logForDiagnosticsNoPII("info", "cli_heartbeat_reactivation_beat", {
          interval_ms: this.heartbeatIntervalMs,
        });
      let h = this.idleTracker?.sampleIdleSeconds();
      let w = this.advertiseHeartbeatProbeSupport ? h : undefined;
      let v = await this.request(
        "post",
        "/worker/heartbeat",
        {
          session_id: this.sessionId,
          worker_epoch: this.workerEpoch,
          ...(this.advertiseHeartbeatProbeSupport && {
            supports_heartbeat_probe: true,
            current_interval_seconds: Math.round(this.heartbeatIntervalMs / 1000),
            ...(w !== undefined && {
              idle_seconds: w,
            }),
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
          parseBody: true,
          countTowardEscalation: e === undefined,
          onLateSocketAnswer: (y) => {
            r.succeededLateOnSocket = true;
            this.takeUpLateBeat(y, lastHeartbeatSentAtMs, s, w);
          },
        },
      );
      if (!v.ok && v.reason === "closed") return;
      this.lastSettledBeat = Math.max(this.lastSettledBeat, s);
      if (!v.ok && r.succeededLateOnSocket) {
        if (v.status === 429) this.lastHeartbeat429AtMs = Date.now();
        logForDebugging(
          "CCRClient: Heartbeat succeeded late on the worker socket; its POST failed, which is not counted as a missed heartbeat",
        );
      }
      if (!v.ok && !r.succeededLateOnSocket) {
        if (e === "probe") logFeatureBad("ccr_heartbeat_probe", "beat_failed");
        else if (e === "resync_stale") logFeatureBad("ccr_reconnect_beat", "beat_failed");
        else if (e === "reactivate") logFeatureBad("ccr_reactivation_beat", "beat_failed");
        if (v.status === 429) {
          this.lastHeartbeat429AtMs = Date.now();
          if (e === "reactivate") this.restoreReactivationArm();
        }
        if (this.isIdleAdvised() && v.status !== 429) {
          logForDiagnosticsNoPII("warn", "cli_heartbeat_idle_reverted_on_failure", {
            status: v.status,
          });
          this.idleGrantLatched = false;
          this.reactivationBeatArmed = false;
          this.applyShorterIntervalNow(this.seedHeartbeatIntervalMs);
        }
        this.reclampCurrentIntervalToTokenLifetime();
        if (v.status !== undefined && HEARTBEAT_FATAL_STATUSES.has(v.status) && !v.nonOriginRefusal) {
          this.resetHeartbeatStreak();
          return;
        }
        if (!this.readTransport.isReadStreamRecentlyAlive()) {
          this.resetHeartbeatStreak();
          return;
        }
        if (this.consecutiveHeartbeatFailures === 0) this.heartbeatStreakStartedAtMs = Date.now();
        this.consecutiveHeartbeatFailures++;
        if (
          !this.heartbeatLostFiredForStreak &&
          this.consecutiveHeartbeatFailures >= MAX_CONSECUTIVE_HEARTBEAT_FAILURES &&
          Date.now() - this.heartbeatStreakStartedAtMs >=
            this.readTransport.getReadStreamRecentLivenessWindowMs()
        ) {
          this.heartbeatLostFiredForStreak = true;
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
      if (v.ok) {
        logForDebugging("CCRClient: Heartbeat sent");
        await this.takeUpBeatAnswer(v.data, lastHeartbeatSentAtMs, s, w);
      }
    } finally {
      this.heartbeatInFlight = false;
      if (this.pendingForcedBeat && !this.closed) {
        this.pendingForcedBeat = false;
        this.refireForcedBeat();
      }
    }
  }
  async takeUpBeatAnswer(e, lastHeartbeatSuccessAtMs, s, r) {
    let h = () => this.lastSucceededBeat > s;
    if (this.lastSettledBeat <= s) this.resetHeartbeatStreak();
    if (!h()) {
      this.lastSucceededBeat = s;
      this.lastHeartbeatSuccessAtMs = lastHeartbeatSuccessAtMs;
    }
    this.onRequestAuthOk?.();
    if (!h() && isPlainObject(e)) this.takeUpFlushPolicy(e.event_flush_policy);
    if (e?.refreshed_auth && this.adoptRefreshedAuth) {
      let y = false;
      try {
        let O = false;
        let C = this.adoptRefreshedAuth(e.refreshed_auth.expires_in_seconds);
        C.then(
          (P) => {
            if (O && P.adopted) {
              this.lastAuthRefreshBadReason = null;
              logFeatureOk("ccr_worker_auth_refresh");
              logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_late_adopted");
              this.renewSocketForNewToken();
            }
          },
          () => {},
        );
        let U = await withDeadline(C, Math.min(AUTH_REFRESH_TIMEOUT_MS, this.heartbeatIntervalMs));
        let S;
        if (U === undefined) {
          O = true;
          S = {
            adopted: false,
            reason: "adopt_timeout",
          };
        } else S = U;
        logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_signal", {
          adopted: S.adopted,
          reason: S.reason,
          expires_in_seconds: e.refreshed_auth.expires_in_seconds,
        });
        if (S.adopted) {
          logFeatureOk("ccr_worker_auth_refresh");
          this.lastAuthRefreshBadReason = null;
          y = true;
        } else if (S.reason && S.reason !== "unchanged" && S.reason !== this.lastAuthRefreshBadReason) {
          this.lastAuthRefreshBadReason = S.reason;
          logFeatureBad("ccr_worker_auth_refresh", S.reason);
        }
      } catch {
        if (this.lastAuthRefreshBadReason !== "adopt_threw") {
          this.lastAuthRefreshBadReason = "adopt_threw";
          logFeatureBad("ccr_worker_auth_refresh", "adopt_threw");
        }
        logForDiagnosticsNoPII("error", "cli_heartbeat_refreshed_auth_adopt_threw");
      }
      if (y) this.renewSocketForNewToken();
    }
    if (h()) return;
    let heartbeatIntervalSeconds = e?.heartbeat_interval_seconds;
    if (
      typeof heartbeatIntervalSeconds !== "number" ||
      !Number.isFinite(heartbeatIntervalSeconds) ||
      heartbeatIntervalSeconds <= 0
    ) {
      if (this.idleGrantLatched) this.armReactivationIfEarned(r, this.heartbeatIntervalMs / 1000);
      this.reclampCurrentIntervalToTokenLifetime();
      return;
    }
    if (this.advertiseHeartbeatProbeSupport) {
      let y = heartbeatIntervalSeconds * 1000 > this.seedHeartbeatIntervalMs;
      if (y) this.armReactivationIfEarned(r, heartbeatIntervalSeconds);
      else this.reactivationBeatArmed = false;
      this.idleGrantLatched = y;
    }
    let v = this.clampToTokenLifetime(
      Math.min(
        Math.max(heartbeatIntervalSeconds * 1000, MIN_HEARTBEAT_INTERVAL_MS),
        this.maxAdvisedIntervalMs,
      ),
    );
    if (v === this.heartbeatIntervalMs) return;
    logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
      from_ms: this.heartbeatIntervalMs,
      to_ms: v,
    });
    if (v < this.heartbeatIntervalMs) this.applyShorterIntervalNow(v);
    else this.heartbeatIntervalMs = v;
  }
  async takeUpLateBeat(e, n, s, r) {
    try {
      if (this.closed || !e.ok) return;
      let body = await e.json();
      if (this.closed) return;
      logForDebugging("CCRClient: Heartbeat answered late on the worker socket");
      this.consecutiveAuthFailures = 0;
      this.consecutiveNotFound = 0;
      await this.takeUpBeatAnswer(body, n, s, r);
    } catch (error) {
      logForDebugging(
        `CCRClient: could not act on a heartbeat answer that arrived late on the worker socket: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
  renewSocketForNewToken() {
    if (!this.workerSocket?.isTransport()) return;
    try {
      this.workerSocket.whenQuiet(() => this.readTransport.renewConnection(), true);
    } catch (error) {
      logForDebugging(
        `CCRClient: could not renew the worker socket for a new token: ${errorMessage(error)}`,
        {
          level: "warn",
        },
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
    ) {
      this.sessionModelTurnStored = resultThatMarks.marked;
      this.reportInternalMetadata({
        model_turn_stored: resultThatMarks.marked,
      });
    }
    if (n === "accepted")
      this.autocompactStateStored =
        e.findLast((h) => !h.ephemeral && h.payload.type === "autocompact_state")?.payload.value ??
        this.autocompactStateStored;
    if (this.onDurableEventsUpload === undefined) return;
    let filtered = e.filter((h) => !h.ephemeral);
    if (filtered.length === 0) return;
    try {
      this.onDurableEventsUpload(filtered, n);
    } catch (error) {
      logForDebugging(
        `CCRClient: onDurableEventsUpload(${n}) threw; the batch's fate is unchanged: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
  writeEvent(e) {
    return this.writeEvents([e]);
  }
  trackFirstFrameUpload(uuid) {
    let n = {};
    this.firstFrameUpload = {
      uuid,
      timing: n,
    };
    return n;
  }
  trackFirstTextFrameUpload(uuid) {
    let n = {};
    this.firstTextFrameUpload = {
      uuid,
      timing: n,
    };
    return n;
  }
  trackFirstBlockFrameUpload(uuid) {
    let n = {};
    this.firstBlockFrameUpload = {
      uuid,
      timing: n,
    };
    return n;
  }
  trackedFrameUploads(e) {
    let n = [];
    for (let s of [this.firstFrameUpload, this.firstTextFrameUpload, this.firstBlockFrameUpload])
      if (s && s.timing[e] === undefined) n.push(s);
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
            : undefined;
      this.liveOnlyShellStarts.delete(S.task_id);
      if (!P) return [S];
      if (
        (S.subtype === "task_updated" && S.patch.is_backgrounded) ||
        Buffer.byteLength(jsonStringify(S)) > MAX_LIVE_RESPONSE_BYTES
      )
        return P === S
          ? [S]
          : [
              {
                ...P,
              },
              S,
            ];
      if (S.subtype !== "task_notification") this.liveOnlyShellStarts.set(S.task_id, P);
      this.rowsMarkedLiveOnly.add(S);
      return [S];
    });
    let artifactSocketIds = this.artifactSocketIds;
    let filtered = (
      !artifactSocketIds
        ? flattened
        : flattened.flatMap((S) => {
            if (S.type !== "system") return [S];
            switch (S.subtype) {
              case "background_tasks_changed": {
                artifactSocketIds.clear();
                let filtered = S.tasks.filter((task) => {
                  if (task.task_type !== "monitor_ws" || task.ambient !== true) return true;
                  artifactSocketIds.add(task.task_id);
                  return false;
                });
                let W = {
                  whole: jsonStringify(S.tasks),
                  withoutSockets: jsonStringify(filtered),
                };
                let x =
                  this.lastTaskList !== undefined &&
                  W.whole !== this.lastTaskList.whole &&
                  W.withoutSockets === this.lastTaskList.withoutSockets;
                this.lastTaskList = W;
                return x
                  ? []
                  : [
                      {
                        ...S,
                        tasks: filtered,
                      },
                    ];
              }
              case "task_started":
                if (S.task_type !== "monitor_ws" || S.ambient !== true) return [S];
                artifactSocketIds.add(S.task_id);
                return [];
              case "task_updated":
                return artifactSocketIds.has(S.task_id) ? [] : [S];
              case "task_notification":
                return S.ambient === true && S.task_id.startsWith("s") ? [] : [S];
              default:
                return [S];
            }
          })
    ).filter((S) => {
      if (
        S.type === "system" &&
        S.subtype === "task_progress" &&
        S.summary === undefined &&
        S.workflow_progress === undefined
      )
        return false;
      if (S.type === "active_goal" || S.type === "autocompact_state") {
        let x = !this.stateRowTypesWritten.has(S.type);
        this.stateRowTypesWritten.add(S.type);
        let goal = this.recordAtStart?.goal;
        return !(
          x &&
          (S.type === "autocompact_state"
            ? En(S.value, this.recordAtStart?.autocompact_state)
            : S.value === null &&
              this.recordAtStart !== undefined &&
              (!isPlainObject(goal) || goal.met === true))
        );
      }
      if (S.type !== "rate_limit_event") return true;
      let P = classifyRowTypeForTelemetry(S);
      let W =
        P === "rate_limit_event/allowed" &&
        P === this.lastRateLimitKind &&
        S.rate_limit_info.overagePeriodMonthly === undefined &&
        S.rate_limit_info.overagePeriodChannel === undefined;
      this.lastRateLimitKind = P;
      return !W || this.currentUploadTrim().rate_limit_repeats !== true;
    });
    if (e.length > 0 && filtered.length === 0) return Promise.resolve();
    this.reportClientRowsOwed(
      this.clientRowsAreGuarded()
        ? this.clientRowsOwed.rowsEntered(filtered, new Date())
        : this.clientRowsOwed.guardEnded(new Date()),
    );
    let settingsAnswersMaxWaitMs = this.flushPolicy?.settingsAnswersMaxWaitMs ?? 0;
    let initMaxWaitMs = this.flushPolicy?.initMaxWaitMs ?? 0;
    if (
      (settingsAnswersMaxWaitMs > 0 || initMaxWaitMs > 0) &&
      filtered.length > 0 &&
      this.followsServedPolicy &&
      !this.closed &&
      this.pickupBarriers.length === 0
    ) {
      let mapped = filtered.map((P) =>
        this.isSettingsAnswer(P)
          ? settingsAnswersMaxWaitMs
          : isTopLevelSystemInit(P) ||
              (P.type === "user" && "isReplay" in P && P.isReplay && this.turnHold === "open")
            ? initMaxWaitMs
            : 0,
      );
      if (mapped.every((P) => P > 0)) {
        this.waitingAnswers.push(...filtered);
        this.waitingAnswersTimer ??= setTimeout(() => this.sendWaitingAnswers(), Math.min(...mapped));
        return Promise.resolve();
      }
    }
    let O =
      this.waitingAnswers.length > 0 &&
      (filtered.length === 0 || filtered.some((S) => S.type !== "stream_event"))
        ? [...this.takeWaitingAnswers(), ...filtered]
        : filtered;
    let last = this.pickupBarriers.at(-1);
    if (!last) return this.writeEventsNow(O, n);
    let deferred = Promise.withResolvers();
    last.writes.push({
      messages: O,
      opts: n,
      written: deferred,
    });
    if (
      this.pickupBarriers.reduce((acc, pickupBarrier) => acc + pickupBarrier.writes.length, 0) >=
      PICKUP_BARRIER_MAX_WRITES
    )
      this.openPickupBarriers(this.pickupBarriers.length);
    return deferred.promise;
  }
  noteSettingsRequest(frame) {
    if (
      !isPlainObject(frame) ||
      frame.type !== "control_request" ||
      typeof frame.request_id !== "string" ||
      !isRelayableControlFrame(frame)
    )
      return;
    this.settingsRequestIds.add(frame.request_id);
    let n = this.settingsRequestIds.values().next().value;
    if (this.settingsRequestIds.size > MAX_SETTINGS_REQUEST_IDS && n !== undefined)
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
    if (this.waitingAnswersTimer) {
      clearTimeout(this.waitingAnswersTimer);
      this.waitingAnswersTimer = null;
    }
    return this.waitingAnswers.splice(0);
  }
  async writeEventsNow(e, n) {
    let s = [];
    let r = [];
    let h;
    let w;
    let v = false;
    let y;
    let O;
    let C = false;
    let U = [];
    let S = [];
    let P = [];
    let W = [];
    let x;
    for (let Y of e) {
      let R = Y.type === "stream_event" ? stripInputTransformations(Y) : Y;
      if (R.type === "stream_event" && R.event.type === "message_start" && !R.parent_tool_use_id) {
        this.modelCallStreamed = true;
        this.streamedResponseId = R.event.message.id;
        if (this.liveTwinTypes()?.size) {
          R = {
            ...R,
          };
          W.push({
            frame: R,
            at: s.length,
            turnId: this.liveTurnId,
            index: this.nextLiveIndex,
          });
        }
      }
      if ((R.type === "assistant" || R.type === "user") && R.parent_tool_use_id)
        this.subAgentWroteSinceStoredRequesting = true;
      let B = this.noteRequestingRow(R);
      if (B) {
        let j = this.toClientEvent(B);
        s.push(B === this.liveOnlyStartingRow ? this.withStamp(j) : j);
      }
      let L = w ? undefined : this.holdAgainAt(R);
      let I = this.turnHold === "open";
      let G = this.releaseFor(R, L);
      if (G === "event" && !w) y = classifyRowTypeForTelemetry(R);
      w ??= G;
      if (I && G === "round_trip" && this.flushPolicy?.holdAcrossModelCalls) {
        w = G;
        y = undefined;
      }
      if (
        (I && G === "round_trip") ||
        R.type === "result" ||
        R.type.startsWith("control_") ||
        (R.type === "system" && "subtype" in R && (R.subtype === "init" || R.subtype === "task_notification"))
      )
        O ??= classifyRowTypeForTelemetry(R);
      if (
        ((this.streamEventFirstFlushMs > 0 && !G) ||
          this.noSubscriberStreamEventFlushIntervalMs > 0 ||
          this.dropUnwatchedStreamEvents ||
          (this.unwatched() && this.currentState === "running")) &&
        this.streamEventFlushIntervalMs > 0 &&
        isThinkingTokensSystemMessage(R)
      ) {
        this.bufferEphemeral(R);
        continue;
      }
      if (R.type === "stream_event") {
        this.streamedEphemeralSinceLastAssistant = true;
        if (
          R.event.type === "message_stop" &&
          this.holdRule === "served_policy" &&
          this.flushPolicy?.flushOnSamplingEnd
        ) {
          this.bufferEphemeral(R);
          h ??= this.streamEventBufferedAt;
          v = true;
          let j = this.takeStreamEventBuffer();
          w ??= j.release;
          s.push(...j.events);
          continue;
        }
        if (this.streamEventFlushIntervalMs <= 0) {
          let j = Buffer.byteLength(jsonStringify(R));
          if (j <= MAX_FRAME_BYTES)
            s.push({
              payload: R,
              ephemeral: true,
            });
          else dropOversizeStreamEvent(R, j);
          continue;
        }
        this.bufferEphemeral(R);
        if (R.event.type === "content_block_start" && this.parkedRows.length > 0) {
          h ??= this.streamEventBufferedAt;
          let j = this.takeStreamEventBuffer();
          w ??= j.release;
          s.push(...j.events);
        }
        continue;
      }
      let X = R.type === "control_request" ? this.toClientEvent(R) : undefined;
      if (
        R.type === "control_request" &&
        X !== undefined &&
        SERVED_CALL_REQUEST_SUBTYPES.has(getControlRequestSubtypeOfEvent(X)) &&
        this.servedCallRequestsJumpQueue()
      ) {
        if (!this.holdsAcrossModelCalls() && this.clientRowsOwed.rowsSentAgain.size === 0) {
          r.push(X);
          this.urgentRequestIds.add(R.request_id);
          let j = this.urgentRequestIds.values().next().value;
          if (this.urgentRequestIds.size > MAX_URGENT_REQUEST_IDS && j !== undefined)
            this.urgentRequestIds.delete(j);
          continue;
        }
        C = true;
      }
      if (R.type === "control_cancel_request" && this.urgentRequestIds.delete(R.request_id)) {
        r.push(this.toClientEvent(R));
        continue;
      }
      if (R.type === "control_cancel_request" && this.holdsAcrossModelCalls()) C = true;
      if (R.type === "assistant" && this.streamedEphemeralSinceLastAssistant) {
        logFeatureOk("ccr_partial_messages", {
          stream_events_dropped_unwatched: this.streamEventsDroppedUnwatched,
        });
        this.streamedEphemeralSinceLastAssistant = false;
        this.streamEventsDroppedUnwatched = 0;
      }
      if (G === undefined && this.mayParkTextRow(R)) {
        this.parkedRows.push({
          message: R,
          event: this.toClientEvent(R),
        });
        continue;
      }
      if (this.streamEventTimer) {
        h ??= this.streamEventBufferedAt;
        let j = this.takeStreamEventBuffer();
        w ??= j.release;
        s.push(...j.events);
      }
      if (this.gatesToolCalls) {
        let mainThreadToolUseIds = getMainThreadToolUseIds(R);
        if (
          mainThreadToolUseIds.some((mainThreadToolUseId) => this.awaitedToolCalls.has(mainThreadToolUseId))
        )
          w ??= "tool_call";
        U.push(...mainThreadToolUseIds);
      }
      let flushAfterToolNames = this.flushPolicy?.flushAfterToolNames;
      if (flushAfterToolNames && flushAfterToolNames.size > 0)
        for (let j of getMainThreadToolUseIds(R, flushAfterToolNames)) {
          this.toolCallsWhoseResultReleases.add(j);
          evictOldestIfFull(this.toolCallsWhoseResultReleases);
        }
      if (this.flushPolicy?.transcriptMaxAgeMs)
        for (let j of getMainThreadToolUseIds(R, READ_NOTIFICATIONS_TOOL_NAMES)) {
          this.toolCallsWhoseResultReleases.add(j);
          evictOldestIfFull(this.toolCallsWhoseResultReleases);
        }
      let holdAgain = this.flushPolicy?.holdAgain;
      if (holdAgain && R.type === "assistant" && !R.parent_tool_use_id) {
        if (R.message.id !== this.newestResponseId) {
          this.newestResponseId = R.message.id;
          this.unansweredCalls.clear();
        }
        for (let j of getMainThreadToolUseIds(R)) this.unansweredCalls.add(j);
        if (getMainThreadToolUseIds(R, holdAgain.neverAfterTools).length > 0) this.holdsNoMoreThisTurn = true;
        if (holdAgain.toolsWhoseResultsWait)
          for (let j of getMainThreadToolUseIds(R, holdAgain.toolsWhoseResultsWait)) {
            this.callsWhoseResultsWait.add(j);
            evictOldestIfFull(this.callsWhoseResultsWait);
          }
      }
      if (holdAgain && R.type === "user") {
        for (let j of collectContentBlockField(R.message, "tool_result", "tool_use_id"))
          this.unansweredCalls.delete(j);
        if (
          holdAgain.toolsWhoseResultsWait &&
          !R.parent_tool_use_id &&
          Array.isArray(R.message.content) &&
          R.message.content.some(
            (j) =>
              j.type === "tool_result" &&
              (j.is_error === true || !this.callsWhoseResultsWait.has(j.tool_use_id)),
          )
        )
          this.heldResultNeedsStore = true;
      }
      if (this.isLiveTwinRow(R)) S.push(s.length);
      if (
        R === this.liveOnlyRequestingRow &&
        this.holdsAcrossModelCalls() &&
        !(
          G === "round_trip" &&
          !I &&
          !this.subAgentWroteSinceStoredRequesting &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING) &&
          (L !== "starts" ||
            (this.nextLiveIndex === this.indexBehindHeldToolResult &&
              this.flushPolicy.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_STARTING)))
        )
      ) {
        this.liveOnlyRequestingRow = undefined;
        x = s.length;
      }
      if (
        G === "round_trip" &&
        R !== this.liveOnlyRequestingRow &&
        !("parent_tool_use_id" in R && R.parent_tool_use_id)
      )
        this.subAgentWroteSinceStoredRequesting = false;
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
      if (R.type === "system" && "subtype" in R && R.subtype === "init" && !q.payload.parent_tool_use_id) {
        this.liveTurnId = q.payload.uuid;
        this.nextLiveIndex = 0;
        this.openTurn();
        this.droppedBeforeLiveTurn = this.droppedDurableBatches;
      }
      if (!q.ephemeral) this.indexBehindHeldToolResult = undefined;
      s.push(q);
    }
    let z = [];
    let heldRepeatUuid = this.heldRepeatUuid;
    if (!w && !v) {
      let filtered = S.filter((R) => {
        let B = s[R];
        return B && !B.historical && this.eventUploader.holdsOnArrival(B);
      });
      if (
        !this.viewerAbsentReported &&
        filtered.some(
          (R) =>
            Buffer.byteLength(jsonStringify(s[R]?.payload)) > MAX_LIVE_RESPONSE_BYTES ||
            estimateJsonEncodedSize(s[R]?.payload) > MAX_EVENT_PAYLOAD_ESTIMATED_BYTES,
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
        let R = filtered.length > 0 ? s.findLast((B) => !B.ephemeral) : undefined;
        if (R?.payload.live_index !== undefined && hasToolResultContent(R.payload.message))
          this.indexBehindHeldToolResult = this.nextLiveIndex;
        if (!this.viewerAbsentReported)
          for (let B of filtered.toReversed()) {
            let L = s[B];
            if (L)
              s.splice(B, 0, {
                payload: L.payload,
                ephemeral: true,
              });
          }
      }
    }
    if (heldRepeatUuid !== undefined && this.toolResultEndsCall && z.length > 0) {
      this.heldRepeatUuid = undefined;
      this.eventUploader.withdraw((Y) => !Y.ephemeral && Y.payload.uuid === heldRepeatUuid);
    }
    for (let { frame, at, turnId, index } of W) {
      frame.live_turn_id = turnId;
      frame.live_next_index = index + count(z, (I) => I < at);
    }
    if (r.length > 0)
      this.enqueueClientEvents(r, {
        urgent: true,
      });
    if (s.length > 0) {
      if (w) {
        if (w !== "round_trip" && S.some((R) => ["assistant", "user"].includes(s[R]?.payload.type ?? "")))
          this.endWholeTurnHold(w);
        this.releaseTranscriptLane(w, y, O);
        this.heldResultNeedsStore = false;
      } else if (v) w = "sampling_end";
      let Y = this.enqueueClientEvents(s, {
        ...(w
          ? {
              release: w,
              releasedBy: y,
            }
          : {
              since: h,
            }),
        ...(n?.together && {
          together: true,
        }),
      });
      if (this.flushPolicy?.noTurnMaxAgeMs) this.applyUploadHold("reset");
      if (C) this.eventUploader.cutBackoff();
      await Y;
      this.noteToolCallRows("client_events", U, "queued");
    } else if (r.length > 0 && w) {
      if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
      this.releaseTranscriptLane(w, undefined, O);
      this.releaseClientEvents(w);
    } else if (v) this.releaseClientEvents("sampling_end");
  }
  releaseTranscriptLane(e, n, s) {
    if (this.holdRule !== "served_policy" || !this.flushPolicy?.transcriptMaxAgeMs)
      this.internalEventUploader.release(e, n);
    else if (s !== undefined) this.internalEventUploader.release("event", s);
  }
  releaseFor(e, n) {
    if (e.type === "result") {
      let s = this.turnHold !== "open";
      this.modelTurnEnded ||= s;
      if (this.flushPolicy?.holdAgain?.laterWorkerHoldsFirstTurn && (s || e.is_error))
        this.resultThatMarks = {
          uuid: e.uuid,
          marked: s,
        };
      this.openTurn();
    }
    if (
      e.type === "system" &&
      "subtype" in e &&
      e.subtype === "status" &&
      "status" in e &&
      e.status === "requesting"
    ) {
      if (!this.seesModelCallBoundaries) {
        this.seesModelCallBoundaries = true;
        this.applyUploadHold("reset");
      }
      if (this.holdRule === "served_policy") {
        let s = this.turnHold === "whole" && !n && this.requestingRowMayWait(e);
        if (
          this.turnHold === "open" &&
          this.flushPolicy?.firstTurnHoldsEachCall &&
          !this.modelTurnEnded &&
          !(this.flushPolicy.holdAgain?.laterWorkerHoldsFirstTurn && this.sessionModelTurnStored)
        ) {
          this.turnHold = "each_call";
          this.holdsNoMoreThisTurn = true;
        } else if (this.turnHold === "open" || n === "starts") {
          this.secondCallStartsHold = this.turnHold === "open" && !this.modelTurnEnded;
          this.turnHold = "whole";
          if (this.holdsAcrossModelCalls()) this.uploadHoldTally.wholeTurnHoldStarted();
        } else if (n === "ends") {
          this.turnHold = "each_call";
          this.uploadHoldTally.wholeTurnHoldEndedEarly();
        }
        return s ? undefined : "round_trip";
      }
    }
    if (e.type === "user" && this.toolResultReleases(e.message)) return "tool_result";
    if (e.type === "assistant" && e.message.id !== this.streamedResponseId && this.isLiveTwinRow(e))
      return "event";
    if (this.holdRule === undefined || this.mayWaitUnderHold(e)) return;
    return "event";
  }
  requestingRowMayWait(e) {
    return (
      this.holdsAcrossModelCalls() && hasUserMessageUuids(e) && !this.flushPolicy?.mustFlushTypes.has(e.type)
    );
  }
  holdAgainAt(e) {
    let holdAgain = this.flushPolicy?.holdAgain;
    if (
      !holdAgain ||
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
    let s = this.requestingRowMayWait(e);
    if (this.unansweredCalls.size > 0) return s ? undefined : "ends";
    let r = this.eventUploader.held();
    return this.turnHold === "each_call" ||
      !s ||
      this.heldResultNeedsStore ||
      (holdAgain.laterWorkerHoldsFirstTurn && this.secondCallStartsHold) ||
      (holdAgain.softAgeMs > 0 && r.ageMs >= holdAgain.softAgeMs) ||
      (holdAgain.softEvents > 0 && r.count >= holdAgain.softEvents)
      ? "starts"
      : undefined;
  }
  toolResultReleases(e) {
    if (this.holdRule !== "served_policy") return false;
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
      e.agentId !== undefined ||
      this.closed ||
      !this.followsServedPolicy ||
      !e.mayWrite()
    )
      return;
    if (flushPolicy.flushAfterTools === "write") {
      this.toolCallsWhoseResultReleases.add(e.toolUseId);
      evictOldestIfFull(this.toolCallsWhoseResultReleases);
    }
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
    let toolUseId = e.toolUseId;
    let now = Date.now();
    let combinedAbortSignal = createCombinedAbortSignal(e.signal, {
      timeoutMs: s,
      refTimer: true,
    });
    this.awaitedToolCalls.add(toolUseId);
    let last = this.pickupBarriers.at(-1);
    if (last && !this.toolCallRows.client_events.has(toolUseId)) {
      this.internalEventUploader.release("tool_call");
      await Promise.race([last.opened.promise, createChildAbortController(combinedAbortSignal.signal)]);
    }
    let combinedAbortSignal_2 = createCombinedAbortSignal(combinedAbortSignal.signal, {
      timeoutMs: this.toolCallRowGraceMs,
      refTimer: true,
    });
    let O = false;
    let C = false;
    try {
      this.releaseClientEvents("tool_call");
      this.internalEventUploader.release("tool_call");
      await Promise.race([
        this.toolCallRowReaches("client_events", toolUseId, "queued"),
        createChildAbortController(combinedAbortSignal_2.signal),
      ]);
      O = this.toolCallRows.client_events.has(toolUseId);
      C = combinedAbortSignal_2.signal.aborted && !combinedAbortSignal.signal.aborted;
      if (O && !this.closed)
        await Promise.race([
          Promise.all(n.map((P) => this.toolCallRowReaches(P, toolUseId, "settled"))),
          createChildAbortController(combinedAbortSignal.signal),
        ]);
    } finally {
      combinedAbortSignal_2.cleanup();
      combinedAbortSignal.cleanup();
      this.awaitedToolCalls.delete(toolUseId);
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
    if (r !== undefined && (r !== "queued" || s === "queued")) return Promise.resolve();
    return new Promise((resolve) => {
      let w = `${e} ${n}`;
      let v = {
        until: s,
        reached: resolve,
      };
      let y = this.toolCallRowWaiters.get(w);
      if (y) y.push(v);
      else this.toolCallRowWaiters.set(w, [v]);
    });
  }
  noteToolCallRows(e, n, s) {
    let r = this.toolCallRows[e];
    for (let h of n) {
      if ((s === "queued" && r.has(h)) || (s === "dropped" && r.get(h) === "stored")) continue;
      r.set(h, s);
      evictOldestIfFull(r);
      let w = `${e} ${h}`;
      let filtered = (this.toolCallRowWaiters.get(w) ?? []).filter((y) => {
        if (y.until === "queued" || s !== "queued") {
          y.reached();
          return false;
        }
        return true;
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
    if (!this.guardsClientRows() || this.hasDisplayHooks === undefined) return false;
    this.displayHookSeen ||= this.hasDisplayHooks();
    return !this.displayHookSeen;
  }
  markOfRepliesShownAsStored() {
    return this.clientRowsAreGuarded() ? sessionIdBody(this.sessionId) || undefined : undefined;
  }
  setDisplayHooksProbe(hasDisplayHooks) {
    this.hasDisplayHooks = hasDisplayHooks;
  }
  noteClientRowsSettled(e, n) {
    if (!this.clientRowsAreGuarded()) this.reportClientRowsOwed(this.clientRowsOwed.guardEnded(new Date()));
    let flattened = n.flatMap((h) => (h.ephemeral ? [] : [h.payload.uuid]));
    let r = count(flattened, (h) => this.clientRowsOwed.rowsSentAgain.has(h));
    if (r > 0) {
      this.ownRowsWaitBehindRowsSentAgainSince = undefined;
      if (e === "stored")
        logFeatureOk("ccr_client_rows_owed", {
          rows: r,
        });
      else
        logFeatureBad("ccr_client_rows_owed", "upload_refused", {
          rows: r,
        });
    }
    this.reportClientRowsOwed(this.clientRowsOwed.rowsAnswered(flattened));
  }
  reportClientRowsOwed(e) {
    if (e !== undefined)
      this.workerState.enqueue({
        internal_metadata: e,
      });
  }
  async clientRowsOwedByEarlierWorkers(e) {
    if (this.clientRowsOwed.earlierSpans.length === 0) return [];
    await e();
    return this.guardsClientRows() ? this.clientRowsOwed.earlierSpans : [];
  }
  async tryClientRowsOwedByEarlierWorkers(e) {
    this.reportClientRowsOwed(this.clientRowsOwed.earlierSpansTried(e));
    if (!(await withDeadline(this.flushWorkerState(), WORKER_STATE_FLUSH_TIMEOUT_MS)))
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
      await this.enqueueClientEvents(n, {
        urgent: true,
      });
    } catch (error) {
      this.clientRowsOwed.earlierRowsWithdrawn();
      throw error;
    }
  }
  giveUpClientRowsOwedByEarlierWorkers() {
    this.reportClientRowsOwed(this.clientRowsOwed.earlierSpansGivenUp());
  }
  rowsSentAgainStepAside(e) {
    let { rowsSentAgain } = this.clientRowsOwed;
    if (!e.some((r) => rowsSentAgain.has(r.payload.uuid))) return;
    if (this.eventUploader.backlog().unsent <= rowsSentAgain.size) {
      this.ownRowsWaitBehindRowsSentAgainSince = undefined;
      return;
    }
    this.ownRowsWaitBehindRowsSentAgainSince ??= Date.now();
    if (Date.now() - this.ownRowsWaitBehindRowsSentAgainSince < ROWS_SENT_AGAIN_WAIT_MS) return;
    this.ownRowsWaitBehindRowsSentAgainSince = undefined;
    let s = new Set(rowsSentAgain);
    e.splice(0, e.length, ...e.filter((r) => !isHistoricalPayloadSeen(r, s)));
    this.eventUploader.withdraw((r) => isHistoricalPayloadSeen(r, s));
    logFeatureSad("ccr_client_rows_owed", "upload_kept_failing", {
      rows: s.size,
    });
    this.clientRowsOwed.earlierRowsWithdrawn();
  }
  mayParkTextRow(e) {
    if (
      e.type !== "assistant" ||
      !this.streamEventTimer ||
      this.streamEventTimerIsSlow ||
      this.lastReportedHasSubscribers === false ||
      this.closed ||
      this.isLiveTwinRow(e)
    )
      return false;
    let content = e.message.content;
    return Array.isArray(content) && content.length > 0 && content.every((s) => s.type === "text");
  }
  liveTwinTypes() {
    return this.holdRule === "served_policy" && this.liveTurnId !== undefined && this.turnHold !== "open"
      ? this.flushPolicy?.liveTwinTypes
      : undefined;
  }
  isLiveTwinRow(e) {
    let n = this.liveTwinTypes();
    return (
      n !== undefined &&
      (e.type === "tool_progress"
        ? e.heartbeat === true
        : !("parent_tool_use_id" in e && e.parent_tool_use_id)) &&
      (e.type !== "user" ||
        (Array.isArray(e.message.content) && e.message.content.every((s) => s.type === "tool_result"))) &&
      (n.has(e.type) || ("subtype" in e && n.has(`${e.type}/${e.subtype}`)))
    );
  }
  takeParkedRows() {
    let mapped = this.parkedRows.map(({ event }) => event);
    this.parkedRows = [];
    return mapped;
  }
  mayWaitUnderHold(e) {
    if (this.isLiveOnlyRow(e)) return true;
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
        ) === true &&
        !this.flushPolicy.mustFlushTypes.has(e.type)
      );
    if (this.holdRule === "no_subscriber_flag" && !SUBSCRIBER_FLAG_REQUIRED) return true;
    if (e.type === "user" && "isReplay" in e && e.isReplay) return false;
    let flushPolicy = this.flushPolicy;
    if (!flushPolicy) return true;
    if (e.type === "assistant" && flushPolicy.flushOnAssistant) return false;
    return !flushPolicy.mustFlushTypes.has(e.type);
  }
  isLiveOnlyRow(e) {
    return (
      this.rowsMarkedLiveOnly.has(e) ||
      (this.followsServedPolicy &&
        this.flushPolicy?.liveOnlyTypes.has(classifyRowTypeForTelemetry(e)) === true)
    );
  }
  noteRequestingRow(e) {
    if ("parent_tool_use_id" in e && e.parent_tool_use_id) return;
    if ("resume_reason" in e && e.resume_reason) this.turnTookInput = true;
    if (e.type === "assistant" || e.type === "user") {
      this.toolResultEndsCall = e.type === "user" && hasToolResultContent(e.message);
      this.liveOnlyRequestingRow = undefined;
    }
    if (e.type !== "system" || !("subtype" in e)) return;
    let status = e.subtype === "status" && "status" in e ? e.status : undefined;
    if (status === "compacting" || e.subtype === "compact_boundary") {
      let liveOnlyRequestingRow = this.liveOnlyRequestingRow;
      this.liveOnlyRequestingRow = undefined;
      return liveOnlyRequestingRow;
    }
    if (status !== "requesting") return;
    let s = jsonStringify("user_message_uuids" in e ? (e.user_message_uuids ?? null) : null);
    let r =
      s === this.lastRequestingList &&
      this.toolResultEndsCall &&
      !this.turnTookInput &&
      this.followsServedPolicy &&
      this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT) === true;
    this.lastRequestingList = s;
    this.toolResultEndsCall = false;
    this.liveOnlyRequestingRow = r ? e : undefined;
    this.heldRepeatUuid = undefined;
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
    let n = capLiveOnlyResponseSize(e, MAX_LIVE_RESPONSE_BYTES);
    let s = n.historical === true;
    let r =
      isThinkingTokensSystemMessage(e) ||
      isLiveOnlyResponse(n) ||
      this.isLiveOnlyRow(e) ||
      e === this.liveOnlyRequestingRow;
    let h =
      n.type === "user" && n.is_virtual !== true
        ? this.uploadedToolResult(n.tool_use_result, n.message)
        : n.tool_use_result;
    return {
      payload: {
        ...n,
        ...(h !== n.tool_use_result && {
          tool_use_result: h,
        }),
        uuid: typeof n.uuid === "string" ? n.uuid : randomUUID(),
      },
      ...(s && {
        historical: true,
      }),
      ...(r && {
        ephemeral: true,
      }),
    };
  }
  uploadedToolResult(e, n) {
    let s = this.currentUploadTrim();
    let r = stripInlineMediaBase64(e, s);
    if (r !== e && !this.loggedToolResultBlank) {
      this.loggedToolResultBlank = true;
      logFeatureOk("ccr_tool_result_blank");
    }
    let h = dedupeMcpImageData(r, n, s);
    if (h !== r && !this.loggedMcpImageBlank) {
      this.loggedMcpImageBlank = true;
      logFeatureOk("ccr_mcp_image_blank");
    }
    return h;
  }
  setStreamEventFlushIntervalMs(e) {
    this.streamEventFlushIntervalMs = parseFlushIntervalMs(
      "streamEventFlushIntervalMs",
      e,
      DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
    );
    if (this.streamEventFlushIntervalMs <= 0 && this.streamEventTimer) this.flushStreamEventBuffer();
    if (this.streamEventFlushIntervalMs <= 0) this.toolInputMayWait = false;
  }
  setStreamEventFirstFlushMs(e) {
    this.streamEventFirstFlushMs = parseFlushIntervalMs("streamEventFirstFlushMs", e, 0);
  }
  setToolInputFlushMs(e) {
    this.toolInputFlushMs = Math.min(parseFlushIntervalMs("toolInputFlushMs", e, 0), MAX_TOOL_INPUT_FLUSH_MS);
  }
  setNoSubscriberStreamEventFlushIntervalMs(e) {
    let flushIntervalMs = parseFlushIntervalMs("noSubscriberStreamEventFlushIntervalMs", e, 0);
    if (flushIntervalMs === this.noSubscriberStreamEventFlushIntervalMs) return;
    this.noSubscriberStreamEventFlushIntervalMs = flushIntervalMs;
    this.setHasSubscribers(undefined, "reset");
  }
  setNoSubscriberUploadHoldMs(e) {
    let flushIntervalMs = parseFlushIntervalMs("noSubscriberUploadHoldMs", e, 0);
    if (flushIntervalMs === this.noSubscriberUploadHoldMs) return;
    this.noSubscriberUploadHoldMs = flushIntervalMs;
    this.setHasSubscribers(undefined, "reset");
  }
  setDropUnwatchedStreamEvents(e) {
    let n = e === true;
    if (n === this.dropUnwatchedStreamEvents) return;
    this.setHasSubscribers(undefined, "reset");
    this.dropUnwatchedStreamEvents = n;
  }
  onSubscribersReported;
  setSubscribersReportedListener(onSubscribersReported) {
    this.onSubscribersReported = onSubscribersReported;
  }
  tellSubscribersReported(e) {
    if (typeof e !== "boolean" || this.onSubscribersReported === undefined) return;
    if (e || !this.senderMayNotBeAttachedYet()) this.onSubscribersReported(e);
  }
  senderMayNotBeAttachedYet() {
    return Date.now() - this.lastInboundEventAtMs < RECENT_INBOUND_EVENT_MS;
  }
  unwatched() {
    return this.noSubscriberUploadHoldMs > 0 && this.lastReportedHasSubscribers === false;
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
        n.viewerCheckpointTimer = null;
        if (n.holdsAcrossModelCalls()) n.uploadHeldRowsForViewer(s).catch(logError);
      },
      Math.max(0, this.lastViewerCheckpointAtMs + VIEWER_CHECKPOINT_INTERVAL_MS - Date.now()),
      this,
      e,
    );
  }
  async uploadHeldRowsForViewer(e) {
    this.lastViewerCheckpointAtMs = Date.now();
    if (this.flushPolicy?.emptyCheckpointKeepsHold && !this.modelCallStreamed)
      this.setHasSubscribers(undefined, "watcher");
    else this.endWholeTurnHold(e);
    let liveTurnId = this.liveTurnId;
    let s = this.nextLiveIndex - 1;
    let droppedBeforeLiveTurn = this.droppedBeforeLiveTurn;
    this.internalEventUploader.release(e);
    this.releaseClientEvents(e);
    await this.flush();
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
          ephemeral: true,
        },
      ],
      {},
    );
  }
  endWholeTurnHold(e) {
    if (this.turnHold === "open") return;
    this.turnHold = "each_call";
    this.uploadHoldTally.wholeTurnHoldEndedEarly();
    if (!e || !this.flushPolicy?.holdAgain?.after.has(e)) this.holdsNoMoreThisTurn = true;
  }
  openTurn() {
    this.lastRequestingList = undefined;
    this.liveOnlyRequestingRow = undefined;
    this.turnTookInput = false;
    this.modelCallStreamed = false;
    this.turnHold = "open";
    this.uploadHoldTally.turnEnded();
    this.holdsNoMoreThisTurn = false;
    this.newestResponseId = undefined;
    this.unansweredCalls.clear();
  }
  holdsAcrossModelCalls() {
    return (
      this.holdRule === "served_policy" &&
      this.seesModelCallBoundaries &&
      this.flushPolicy?.holdAcrossModelCalls === true
    );
  }
  decideHoldRule() {
    if (this.currentState !== "running" || this.shutdownReleased) return;
    if (
      this.servedPolicyHolds() &&
      (this.seesModelCallBoundaries || this.lastReportedHasSubscribers === false)
    )
      return "served_policy";
    return this.unwatched() ? "no_subscriber_flag" : undefined;
  }
  applyUploadHold(e) {
    let n = this.decideHoldRule();
    this.holdRule = n;
    this.eventUploader.setHold(
      n &&
        this.laneHold(
          n,
          !this.seesModelCallBoundaries
            ? neverFlush
            : this.flushPolicy?.controlTrafficKeepsHold
              ? isEphemeralKeepAliveOrControlResponse
              : isEphemeralOrKeepAlive,
          this.turnHold === "open" ? this.flushPolicy?.noTurnMaxAgeMs : undefined,
        ),
      e,
    );
    this.internalEventUploader.setHold(
      n && this.laneHold(n, neverFlush, this.flushPolicy?.transcriptMaxAgeMs),
      e,
    );
  }
  laneHold(e, passes, s) {
    let flushPolicy = this.flushPolicy;
    if (e === "served_policy" && flushPolicy)
      return {
        rule: e,
        maxAgeMs: Math.min(
          s || flushPolicy.maxAgeMs,
          !this.seesModelCallBoundaries
            ? DEFAULT_TRANSCRIPT_MAX_AGE_MS
            : flushPolicy.holdAcrossModelCalls
              ? MAX_HOLD_AGE_MS
              : DEFAULT_MAX_HOLD_AGE_MS,
        ),
        maxItems: flushPolicy.maxEvents,
        maxBytes: flushPolicy.maxBytes,
        passes,
      };
    return {
      rule: "no_subscriber_flag",
      maxAgeMs: this.noSubscriberUploadHoldMs,
    };
  }
  takeUpFlushPolicy(e) {
    let n = e ?? this.launchFlushPolicy;
    let s = n == null ? undefined : parseHoldPolicy(n);
    if (n != null && !s && !this.loggedUnreadableFlushPolicy) {
      this.loggedUnreadableFlushPolicy = true;
      logForDiagnosticsNoPII("warn", "cli_ccr_flush_policy_unreadable");
    }
    let flushPolicy = this.flushPolicy;
    if (!summarizeAssistantMessage(flushPolicy, s)) {
      this.flushPolicy = s;
      this.callsWhoseResultsWait.clear();
      if (
        flushPolicy?.flushAfterTools !== s?.flushAfterTools ||
        !setsEqual(flushPolicy?.flushAfterToolNames, s?.flushAfterToolNames)
      )
        this.toolCallsWhoseResultReleases.clear();
      logForDiagnosticsNoPII(
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
            hold_again: s.holdAgain !== undefined,
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
            later_worker_holds_first_turn: s.holdAgain?.laterWorkerHoldsFirstTurn === true,
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
      );
      this.applyUploadHold("reset");
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
      this.heldShellTaskIds.clear();
      this.heldRepeatUuid = undefined;
      this.indexBehindHeldToolResult = undefined;
      if (n !== "round_trip") this.endWholeTurnHold(n);
    }
    this.uploadHoldTally.released(e, s, r);
    logForDiagnosticsNoPII("info", "cli_ccr_event_hold_release", {
      lane: e,
      reason: n,
      ...(w !== undefined && {
        released_by: w,
      }),
      held_events: s,
      held_ms: r,
    });
  }
  uploadBody(events, n) {
    let s = {
      worker_epoch: this.workerEpoch,
      events,
    };
    if (this.uploadHoldMarker())
      s.upload_hold = {
        held: n.held,
        flush_reason: n.reason,
        held_count: clampInt32(n.heldCount),
        hold_age_ms: clampInt32(n.holdAgeMs),
        inflight_retry_count: clampInt32(n.retryCount),
        hold_rule: n.rule,
        post_index: clampInt32(n.postIndex),
        ...(this.flushPolicy?.policyVersion !== undefined && {
          policy_version: this.flushPolicy.policyVersion,
        }),
      };
    return s;
  }
  retrySmaller(
    e,
    n,
    s,
    r,
    h = {
      bytes: s.bytes,
    },
  ) {
    let w = {
      count: n.length,
      kib: Math.round(h.bytes / 1024),
      retry_count: s.retryCount,
      timeout_ms: r,
    };
    logForDebugging(
      `CCRClient: ${e} POST of ${w.count} event(s), ${w.kib} KiB got no response (the connection failed, or no answer within ${r}ms) after ${w.retry_count} earlier failure(s); ${h.bytes >= LARGE_BATCH_BYTES && s.cuttable ? "retrying it in smaller batches" : "retrying it"}`,
      {
        level: "warn",
      },
    );
    logForDiagnosticsNoPII(
      "warn",
      e === "client_events" ? "cli_worker_events_no_response" : "cli_worker_internal_events_no_response",
      w,
    );
    return new ClientEventTooSmallError(`${e} POST got no response`, LARGE_BATCH_BYTES);
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
        {
          lane: fromEnum(e),
          undelivered_events: n,
        },
      );
    if (this.servedPolicyHolds())
      logForDiagnosticsNoPII("warn", "cli_ccr_event_hold_undelivered_at_close", {
        lane: e,
        undelivered_events: n,
        for_successor: this.closingForSuccessor,
      });
  }
  bufferEphemeral(e) {
    let n = this.streamEventFirstFlushMs > 0 && e.type === "stream_event" ? e.event.type : undefined;
    let s = n === "content_block_start";
    if (s) this.firstContentFlushPending = true;
    let event = e.type === "stream_event" && !e.parent_tool_use_id ? e.event : undefined;
    if (event?.type === "content_block_start") {
      this.toolInputMayWait =
        event.content_block.type === "tool_use" && TOOLS_WHOSE_INPUT_MAY_WAIT.has(event.content_block.name);
      this.toolInputChars = 0;
    }
    let h = this.toolInputChars >= MAX_TOOL_INPUT_CHARS_BEFORE_FLUSH;
    let w = false;
    if (event?.type === "content_block_delta" && event.delta.type === "input_json_delta") {
      this.toolInputChars += event.delta.partial_json.length;
      w = this.toolInputMayWait && this.toolInputFlushMs > 0;
    }
    if (this.dropUnwatchedStreamEvents && this.unwatchedPastGrace) {
      if (e.type === "stream_event") this.streamEventsDroppedUnwatched++;
      return;
    }
    this.streamEventBuffer.push(e);
    let v = this.firstContentFlushPending && n === "content_block_delta";
    if (v) this.firstContentFlushPending = false;
    let y = s || (v && !w);
    if (
      v &&
      this.firstDeltaFlushTimer === null &&
      e.type === "stream_event" &&
      e.event.type === "content_block_delta" &&
      e.event.delta.type !== "input_json_delta" &&
      !(
        this.lastReportedHasSubscribers === false &&
        (this.noSubscriberStreamEventFlushIntervalMs > 0 || this.noSubscriberUploadHoldMs > 0)
      )
    )
      this.firstDeltaFlushTimer = setTimeout(() => {
        this.firstDeltaFlushTimer = null;
        this.flushStreamEventBuffer(true);
      }, 0);
    let O = this.streamEventTimerIsSlow && !w;
    if (this.streamEventTimer && !y && !O) return;
    let C = w && h;
    this.streamEventTimerIsSlow = C;
    let now = Date.now();
    let max = Math.max(this.toolInputFlushMs, this.streamEventFlushIntervalMs);
    let P = y
      ? Math.min(this.streamEventFirstFlushMs, this.streamEventFlushIntervalMs)
      : C
        ? Math.min(Math.max(this.streamEventsTakenAt + max - now, this.streamEventFlushIntervalMs), max)
        : this.streamEventFlushIntervalMs;
    if (P > this.streamEventFlushIntervalMs && !this.loggedToolInputFlush) {
      this.loggedToolInputFlush = true;
      logFeatureOk("ccr_tool_input_flush");
    }
    let W =
      this.lastReportedHasSubscribers === false
        ? Math.max(this.noSubscriberStreamEventFlushIntervalMs, this.noSubscriberUploadHoldMs, P)
        : P;
    if (this.streamEventTimer) {
      if (now + W >= this.streamEventFlushDueAt) return;
      clearTimeout(this.streamEventTimer);
    } else this.streamEventBufferedAt = now;
    this.streamEventFlushDueAt = now + W;
    this.streamEventTimer = setTimeout(() => void this.flushStreamEventBuffer(), W);
  }
  setHasSubscribers(e, n) {
    this.hasSubscribersReports++;
    let s = typeof e === "boolean" && (e || !this.senderMayNotBeAttachedYet()) ? e : undefined;
    let lastReportedHasSubscribers = this.lastReportedHasSubscribers;
    this.lastReportedHasSubscribers = s;
    if (s === true) this.viewerReportedSinceLastFalse = true;
    else if (s === false && this.viewerReportedSinceLastFalse) {
      this.viewerReportedSinceLastFalse = false;
      this.lastViewerLeftAtMs = Date.now();
    }
    let unwatchedPastGrace = this.unwatchedPastGrace;
    this.unwatchedPastGrace = s === false && Date.now() - this.lastViewerLeftAtMs >= VIEWER_LEFT_GRACE_MS;
    if (this.dropUnwatchedStreamEvents && unwatchedPastGrace !== this.unwatchedPastGrace)
      logForDebugging(
        this.unwatchedPastGrace
          ? "CCRClient: no subscribers reported; dropping stream deltas until one is"
          : `CCRClient: resuming stream deltas (${s === true ? "watcher" : n})`,
      );
    if (lastReportedHasSubscribers === false && s !== false && this.streamEventTimer)
      this.flushStreamEventBuffer();
    let w = s === true ? "watcher" : n;
    if (s === false) this.viewerAbsentReported = true;
    else if (this.viewerAbsentReported && w === "watcher") {
      this.viewerAbsentReported = false;
      if (this.holdRule === "served_policy") {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        this.releaseClientEvents("watcher");
        this.internalEventUploader.release("watcher");
      }
    }
    this.applyUploadHold(w);
  }
  async flushStreamEventBuffer(e = false) {
    let { events, release } = this.takeStreamEventBuffer(e);
    if (events.length > 0) {
      if (release) this.releaseTranscriptLane(release);
      await this.enqueueClientEvents(
        events,
        release
          ? {
              release,
            }
          : {
              since: this.streamEventBufferedAt,
            },
      );
    }
  }
  enqueueClientEvents(e, n) {
    for (let s of this.trackedFrameUploads("enqueuedAtMs")) {
      let found = e.find((v) => v.payload.uuid === s.uuid);
      if (!found) continue;
      let h = this.eventUploader.inFlightBatch();
      let w;
      if (n.release === undefined && this.eventUploader.holdsOnArrival(found)) w = "hold";
      else if (h !== undefined) w = h.some((v) => !v.ephemeral) ? "durable_post" : "ephemeral_post";
      else if (this.eventUploader.backlog().backingOff) w = "retry_backoff";
      else w = "none";
      s.timing.enqueuedAtMs = performance.now();
      s.timing.queuedBehind = w;
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
      this.flushPolicy?.eventBatchUpload !== true ||
      this.ridesAreOff()
    )
      return;
    let { promise, resolve } = Promise.withResolvers();
    this.ridingRows = {
      rows: e,
      bytes: n.bytes,
      settle: resolve,
    };
    queueMicrotask(() => {
      if (this.ridingRows?.rows === e && !this.liveViewLaneSendsMore()) this.giveBackRidingRows();
    });
    return promise;
  }
  liveViewLaneSendsMore() {
    let { unsent, backingOff } = this.eventUploader.backlog();
    return (
      !backingOff &&
      unsent > (this.eventUploader.inFlightBatch()?.length ?? 0) + this.eventUploader.held().count
    );
  }
  ridesAreOff() {
    return this.ridesRefused || performance.now() < this.ridesPausedUntilMs;
  }
  noteRouteOnlyFailure(e) {
    this.routeOnlyFailures++;
    if (this.routeOnlyFailures < 2 && e !== 405 && e !== 501) return;
    let min = Math.min(RIDE_PAUSE_BASE_MS * 2 ** this.ridePauses, RIDE_PAUSE_MAX_MS);
    this.ridePauses++;
    this.ridesPausedUntilMs = performance.now() + min;
    logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_paused", {
      status: e,
      pause_ms: min,
    });
  }
  giveBackRidingRows() {
    this.ridingRows?.settle(false);
    this.ridingRows = undefined;
  }
  settlesTakenRiders(e) {
    let n = () => {
      this.takenRiders?.settle(false);
      this.takenRiders = undefined;
    };
    return (s, r) => {
      let h = e(s, r);
      h.then(n, n);
      return h;
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
  takeStreamEventBuffer(e = false) {
    if (!e) {
      if (this.streamEventTimer) {
        if (this.firstTextFrameUpload)
          recordTimerLateness(this.firstTextFrameUpload.timing, Date.now() - this.streamEventFlushDueAt);
        clearTimeout(this.streamEventTimer);
        this.streamEventTimer = null;
      }
      this.streamEventTimerIsSlow = false;
      if (this.firstDeltaFlushTimer) {
        clearTimeout(this.firstDeltaFlushTimer);
        this.firstDeltaFlushTimer = null;
      }
    }
    let release;
    let parkedRows = e ? [] : this.parkedRows;
    for (let { message } of parkedRows) release ??= this.releaseFor(message);
    if (this.streamEventBuffer.length === 0)
      return {
        events: e ? [] : this.takeParkedRows(),
        release,
      };
    let r = [];
    let h;
    let w = 0;
    for (let C of this.streamEventBuffer) {
      if (C.type === "stream_event") {
        r.push(C);
        continue;
      }
      w =
        (h !== undefined && C.estimated_tokens - C.estimated_tokens_delta === h.estimated_tokens ? w : 0) +
        C.estimated_tokens_delta;
      h = C;
    }
    this.streamEventBuffer = [];
    this.streamEventsTakenAt = Date.now();
    for (let C of this.trackedFrameUploads("enqueuedAtMs")) C.uuid = findCoalescedRunHead(r, C.uuid);
    let mapped = coalesceStreamEvents(r)
      .filter((C) => {
        let U = Buffer.byteLength(jsonStringify(C));
        if (U <= MAX_FRAME_BYTES) return true;
        dropOversizeStreamEvent(C, U);
        return false;
      })
      .map((payload) => ({
        payload,
        ephemeral: true,
      }));
    if (h)
      mapped.push(
        this.toClientEvent({
          ...h,
          estimated_tokens_delta: w,
        }),
      );
    if (!e) mapped.push(...this.takeParkedRows());
    return {
      events: mapped,
      release,
    };
  }
  currentUploadTrim() {
    let e = this.uploadTrim();
    return isPlainObject(e) ? e : EMPTY_UPLOAD_TRIM;
  }
  async writeInternalEvent(e, n, { isCompaction = false, agentId, preservedEventIds } = {}) {
    let w = preservedEventIds;
    let v = trimPreservedMessagesMetadata(n);
    if (w && w.length > MAX_PRESERVED_MESSAGE_UUIDS) {
      logEvent("tengu_ccr_preserved_event_ids_clamped", {
        originalCount: w.length,
        cap: MAX_PRESERVED_MESSAGE_UUIDS,
        payloadClamped: v !== null,
      });
      w = w.slice(-MAX_PRESERVED_MESSAGE_UUIDS);
    }
    let y = v ?? n;
    if (this.currentUploadTrim().envelope === true) {
      let x = stripTranscriptOnlyFields(y, this.keepsRequestId);
      if (x !== y && !this.loggedTranscriptEnvelopeStrip) {
        this.loggedTranscriptEnvelopeStrip = true;
        logFeatureOk("ccr_worker_envelope_strip");
      }
      if (
        !this.loggedRequestIdKept &&
        isAssistantWithMessageId(x) &&
        typeof x.requestId === "string" &&
        this.keepsRequestId()
      ) {
        this.loggedRequestIdKept = true;
        logFeatureOk("ccr_worker_error_request_id_kept");
      }
      y = x;
    }
    if (e === "transcript" && y.type === "user" && y.isVirtual !== true) {
      let x = this.uploadedToolResult(y.toolUseResult, y.message);
      if (x !== y.toolUseResult)
        y = {
          ...y,
          toolUseResult: x,
        };
    }
    let O = {
      payload: {
        type: e,
        ...y,
        uuid: typeof y.uuid === "string" ? y.uuid : randomUUID(),
      },
      ...(isCompaction && {
        is_compaction: true,
      }),
      ...(agentId && {
        session_agent_id: agentId,
      }),
      ...(w?.length && {
        preserved_event_ids: w,
      }),
    };
    let C = [O];
    let U = agentId || "";
    let S = this.rowsAwaitingCompactSummary.get(U);
    if (
      e === "transcript" &&
      (S !== undefined || (isCompaction && this.rowsAwaitingCompactSummaryAtClose === undefined))
    ) {
      if (S === undefined) {
        S = {
          rows: [],
          timer: this.startCompactSummaryWaitTimer(U),
        };
        this.rowsAwaitingCompactSummary.set(U, S);
      }
      S.rows.push(O);
      let x =
        y.isCompactSummary === true
          ? "summary"
          : y.type === "user" || y.type === "assistant"
            ? "user_or_assistant_row"
            : S.rows.length >= MAX_VIEWER_ROWS_BEFORE_FLUSH
              ? "row_cap"
              : undefined;
      if (x === undefined) return;
      C = this.takeRowsAwaitingCompactSummary(U, x);
    }
    let P = e === "transcript" && y.type === "user" && this.toolResultReleases(y.message);
    let W = this.gatesToolCalls && e === "transcript" && !agentId ? getMainThreadToolUseIds(y) : [];
    await this.queueInternalEvents(
      C,
      P
        ? "tool_result"
        : W.some((x) => this.awaitedToolCalls.has(x))
          ? "tool_call"
          : !this.transcriptRowMayWait(e, y, agentId)
            ? "event"
            : undefined,
    );
    if (e === "transcript") this.transcriptLaneInUse = true;
    this.noteToolCallRows("internal_events", W, "queued");
  }
  async queueInternalEvents(e, n) {
    let s = e[0]?.is_compaction === true && this.holdRule !== undefined;
    if (s) this.releaseClientEvents("event", "compaction");
    let mapped = (
      e[0]?.is_compaction === true && e[0].session_agent_id === undefined
        ? (this.rowsRepeatedAfterCompaction?.() ?? [])
        : []
    ).map(({ eventType, payload }) => ({
      payload: {
        type: eventType,
        ...payload,
        uuid: randomUUID(),
      },
    }));
    let w = [...e, ...mapped];
    this.markInternalEventPostWatch((v) => v.noteQueued(w));
    await this.internalEventUploader.enqueue(w, {
      together: true,
      release: s ? "event" : n,
    });
  }
  startCompactSummaryWaitTimer(e) {
    let timer = setTimeout(
      (s, r) => {
        let h = s.rowsAwaitingCompactSummary.get(r);
        if (s.closed || h === undefined) return;
        if (!s.internalEventUploader.hasRoomFor(1)) {
          h.timer = s.startCompactSummaryWaitTimer(r);
          return;
        }
        s.queueInternalEvents(s.takeRowsAwaitingCompactSummary(r, "timeout"), undefined).catch(logError);
      },
      HELD_ROWS_MAX_AGE_MS,
      this,
      e,
    );
    timer.unref?.();
    return timer;
  }
  takeRowsAwaitingCompactSummary(e, n) {
    let s = this.rowsAwaitingCompactSummary.get(e);
    this.rowsAwaitingCompactSummary.delete(e);
    clearTimeout(s?.timer);
    let rows = s?.rows ?? [];
    if (n !== "summary" && n !== "close")
      logForDiagnosticsNoPII("info", "cli_worker_compaction_marker_uploaded_without_summary", {
        reason: n,
        count: rows.length,
        subagent: e !== "",
      });
    return rows;
  }
  transcriptRowMayWait(e, n, s) {
    let flushPolicy = this.flushPolicy;
    if (this.holdRule !== "served_policy" || !flushPolicy) return true;
    let h = e === "transcript" ? n.type : e;
    if (typeof h !== "string" || flushPolicy.mustFlushTypes.has(h)) return false;
    if (h === "user") {
      if (flushPolicy.holdAcrossModelCalls && this.turnHold === "open" && !s) return false;
      return (
        n.toolUseResult !== undefined ||
        hasToolResultContent(n.message) ||
        n.isMeta === true ||
        n.isVirtual === true ||
        n.isCompactSummary === true
      );
    }
    return !(h === "assistant" && flushPolicy.flushOnAssistant);
  }
  flushInternalEvents(e) {
    return this.internalEventUploader.flush(e);
  }
  watchInternalEventPosts() {
    let e = new UploadBacklogStats(this.internalEventUploader.backlog().unsent);
    this.internalEventPostWatch = e;
    return (n) => {
      if (this.internalEventPostWatch === e) this.internalEventPostWatch = undefined;
      return e.seen(n);
    };
  }
  markInternalEventPostWatch(e) {
    let internalEventPostWatch = this.internalEventPostWatch;
    if (internalEventPostWatch === undefined) return;
    try {
      e(internalEventPostWatch);
    } catch (error) {
      this.internalEventPostWatch = undefined;
      logError(error);
    }
  }
  hasUnsentUploads() {
    let { unsentClientEvents, unsentInternalEvents } = this.uploadBacklog();
    return (
      this.streamEventTimer !== null ||
      unsentClientEvents > 0 ||
      unsentInternalEvents > 0 ||
      this.deliveryUploader.backlog().unsent > 0 ||
      this.workerState.unsent
    );
  }
  uploadBacklog() {
    let e = this.eventUploader.backlog();
    let n = this.internalEventUploader.backlog();
    let filtered = [e.inFlightMs, n.inFlightMs].filter((r) => r !== undefined);
    return {
      unsentClientEvents: e.unsent,
      unsentInternalEvents: n.unsent + this.countRowsAwaitingCompactSummary(),
      oldestInFlightMs: filtered.length ? Math.max(...filtered) : undefined,
      backingOff: e.backingOff || n.backingOff,
    };
  }
  async postInternalEventsBatch(events, n = {}) {
    let s = this.refuseInternalEventsCall(true);
    if (s) return s;
    let epochMismatchCount = this.epochMismatchCount;
    try {
      let h = await this.request(
        "post",
        "/worker/internal-events",
        {
          worker_epoch: this.workerEpoch,
          events,
        },
        "internal events batch",
        {
          parseBody: true,
          countTowardEscalation: false,
          signal: n.signal,
        },
      );
      if (h.ok) {
        let w = eventBatchResultSchema().safeParse(h.data);
        return {
          ok: true,
          results: w.success ? w.data.results : undefined,
        };
      }
      return this.internalEventsFailure(h, epochMismatchCount);
    } catch (error) {
      return this.internalEventsFailure(
        {
          reason: `fetch_failed:${mergeClients(error)}`,
        },
        epochMismatchCount,
      );
    }
  }
  async getInternalEventsPage(e, n = {}) {
    let s = this.refuseInternalEventsCall(false);
    if (s) return s;
    let r = new URL(`${this.sessionBaseUrl}/worker/internal-events`);
    if (e.limit !== undefined) r.searchParams.set("limit", String(e.limit));
    if (e.agentId) r.searchParams.set("session_agent_id", e.agentId);
    if (e.subagents) r.searchParams.set("subagents", "true");
    if (e.cursor) r.searchParams.set("cursor", e.cursor);
    else if (e.afterEventId) r.searchParams.set("after_event_id", e.afterEventId);
    let epochMismatchCount = this.epochMismatchCount;
    let w;
    try {
      let authHeaders = this.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0)
        return {
          ok: false,
          reason: "no_auth_headers",
        };
      w = n.signal
        ? createCombinedAbortSignal(n.signal, {
            timeoutMs: 30000,
            refTimer: true,
          })
        : undefined;
      let response = await fetch(r, {
        headers: {
          ...authHeaders,
          "anthropic-version": "2023-06-01",
          "anthropic-client-platform": getClientPlatform(),
          "User-Agent": claudeCodeUserAgent(),
        },
        signal: w?.signal ?? AbortSignal.timeout(30000),
        ...getProxyFetchOptions({
          url: r.toString(),
        }),
      });
      if (response.ok) {
        let P;
        try {
          P = await response.json();
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
        let W = sessionEventsPageSchema().safeParse(P);
        if (!W.success) {
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_page_foreign");
          return {
            ok: false,
            status: response.status,
            reason: "foreign_body",
          };
        }
        let x = Number(response.headers.get("content-length") ?? Number.NaN);
        return {
          ok: true,
          data: W.data.data.map(normalizePayload),
          ...(W.data.next_cursor && {
            nextCursor: W.data.next_cursor,
          }),
          bytes: Number.isFinite(x) ? x : null,
        };
      }
      let errorType;
      let resourceType;
      let retryAfterMs;
      let closedConflict;
      if (response.status === 409) {
        let conflictReason = await readConflictReason(response);
        if (this.closed) closedConflict = conflictReason ?? this.lastEpochMismatchCause ?? "epoch_conflict";
        else
          try {
            this.handleEpochMismatch(conflictReason);
          } catch (error) {
            logForDebugging(`CCRClient: onEpochMismatch threw during a page read: ${errorMessage(error)}`);
          }
      } else if (response.status === 404)
        try {
          let body = await response.json();
          if (typeof body?.error?.type === "string") errorType = body.error.type;
          if (typeof body?.error?.resource_type === "string") resourceType = body.error.resource_type;
        } catch {}
      else {
        if (response.status === 429) {
          let P = parseInt(response.headers.get("retry-after") ?? "", 10);
          if (!isNaN(P) && P >= 0) retryAfterMs = P * 1000;
        }
        response.body?.cancel();
      }
      logForDebugging(`CCRClient: internal events page returned ${response.status}`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
        method: "get",
        path: "/worker/internal-events",
        status: response.status,
      });
      return this.internalEventsFailure(
        {
          status: response.status,
          retryAfterMs,
          reason: `http_${response.status}`,
        },
        epochMismatchCount,
        {
          errorType,
          resourceType,
          closedConflict,
        },
      );
    } catch (error) {
      logForDebugging(`CCRClient: internal events page failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      return this.internalEventsFailure(
        {
          reason: `fetch_failed:${mergeClients(error)}`,
        },
        epochMismatchCount,
      );
    } finally {
      w?.cleanup();
    }
  }
  refuseInternalEventsCall(e) {
    if (this.closed)
      return {
        ok: false,
        reason: "client_closed",
        ...(this.lastEpochMismatchCause && {
          conflict: this.lastEpochMismatchCause,
        }),
      };
    if (e && this.workerEpoch <= 0)
      return {
        ok: false,
        reason: "not_initialized",
      };
    return;
  }
  internalEventsFailure(e, n, { errorType, resourceType, closedConflict } = {}) {
    let w =
      closedConflict ??
      (this.epochMismatchCount > n
        ? this.lastEpochMismatchCause
        : e.status === 409
          ? (this.lastEpochMismatchCause ?? "epoch_conflict")
          : undefined);
    let v = e.status ?? (w && CONFLICT_REASON_IS_SUPERSEDED[w] ? 409 : undefined);
    return {
      ok: false,
      reason: v === 409 ? "http_409" : (e.reason ?? "unknown"),
      ...(v !== undefined && {
        status: v,
      }),
      ...(e.retryAfterMs !== undefined && {
        retryAfterMs: e.retryAfterMs,
      }),
      ...(w && {
        conflict: w,
      }),
      ...(errorType && {
        errorType,
      }),
      ...(resourceType && {
        resourceType,
      }),
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
    for (let { payload, session_agent_id: sessionAgentId } of e)
      if (sessionAgentId === undefined) this.refusedInternalEventUuids.add(payload.uuid);
    let n = this.refusedInternalEventUuids.size - MAX_REFUSED_INTERNAL_EVENT_UUIDS;
    for (let refusedInternalEventUuid of this.refusedInternalEventUuids) {
      if (n-- <= 0) break;
      this.refusedInternalEventUuids.delete(refusedInternalEventUuid);
    }
  }
  dropOrphanedHandedOffLines(e) {
    let n = 0;
    for (let s = 0; s < e.length;) {
      let r = e[s];
      let { payload } = r;
      if (
        r.session_agent_id === undefined &&
        (payload.handedOff === true ||
          (payload.type === "system" && payload.subtype === UPGRADE_RELAY_MARKER)) &&
        !(payload.type === "user" && !hasToolResultContent(payload.message)) &&
        typeof payload.parentUuid === "string" &&
        this.refusedInternalEventUuids.has(payload.parentUuid)
      ) {
        e.splice(s, 1);
        n++;
        this.noteRefusedInternalEvents([r]);
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
    this.sendWaitingReceipts();
    await Promise.all(this.deliveryAcksWaitingForRoom);
    await this.deliveryUploader.flush();
    return this.droppedDeliveryAckBatches === droppedDeliveryAckBatches && !this.closed;
  }
  flushDeliveryAcks(e) {
    if (this.receiptsRide) return this.receiptsRide.promise.then(() => this.flushDeliveryAcks(e));
    this.sendWaitingReceipts();
    return this.deliveryUploader.flush(e);
  }
  async flush(e) {
    if (this.waitingAnswers.length > 0) await this.writeEvents([]);
    await this.flushStreamEventBuffer();
    return this.eventUploader.flush(e);
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
    this.eventUploader.discardUndelivered();
    return filtered;
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
  async readInternalEventsForCatchUp(signal, n, s) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      {
        limit: "1000",
        ...(n && {
          after_event_id: n,
        }),
      },
      "internal_events",
      {
        maxAttempts: WORKER_STATE_MAX_ATTEMPTS,
        signal,
      },
      s,
    );
  }
  static readInternalEventsFrom(e, n, signal, r) {
    return CCRClient.paginatedGet(
      e,
      "/worker/internal-events",
      {
        limit: "1000",
        ...(n && {
          after_event_id: n,
        }),
      },
      "internal_events",
      {
        signal,
      },
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
      {
        subagents: "true",
        limit: "1000",
      },
      "subagent_events",
    );
  }
  async readAgentInternalEvents(sessionAgentId, signal, s, r) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      {
        session_agent_id: sessionAgentId,
        limit: "1000",
        ...(r && {
          after_event_id: r,
        }),
      },
      "agent_events",
      {
        maxAttempts: WORKER_STATE_MAX_ATTEMPTS,
        signal,
      },
      s,
      Boolean(r),
    );
  }
  async readAgentMetadataEvents(e, signal) {
    let r = isEssentialTrafficOnly() ? "essential-traffic-only" : this.providerWithheldReason();
    if (r !== undefined) {
      logForDiagnosticsNoPII("info", "cli_worker_request_withheld", {
        method: "post",
        path: "/worker/agent-metadata-events/batch-get",
        reason: r,
      });
      return null;
    }
    let h = [];
    for (let sessionAgentIds of chunk_default(uniq(e), INTERNAL_EVENT_UUID_BATCH_SIZE)) {
      let authHeaders = this.readSource.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0) return null;
      let y = await CCRClient.getWithRetry(
        {
          ...this.readSource,
          onConflict: undefined,
        },
        `${this.readSource.sessionBaseUrl}/worker/agent-metadata-events/batch-get`,
        authHeaders,
        "agent_metadata_events",
        undefined,
        (status) => {
          logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
            method: "post",
            path: "/worker/agent-metadata-events/batch-get",
            status,
          });
        },
        {
          signal,
          postJson: jsonStringify({
            session_agent_ids: sessionAgentIds,
          }),
          permanentStatuses: [403, 404, 501],
          readBody: async (O) => {
            let C;
            try {
              C = await O.json();
            } catch (error) {
              if (!(error instanceof SyntaxError)) throw error;
            }
            let U = agentMetadataEventsSchema().safeParse(C);
            if (!U.success) {
              logForDiagnosticsNoPII("warn", "cli_worker_agent_metadata_events_foreign");
              return null;
            }
            return U.data.data ?? [];
          },
        },
      );
      if (y === null) return null;
      h.push(...y);
    }
    return h;
  }
  static async paginatedGet(e, n, s, r, h = {}, w, v = false) {
    let authHeaders = e.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) return null;
    let O = v
      ? {
          ...h,
          maxAttempts: 1,
        }
      : h;
    let C = [];
    let U;
    let S = 0;
    let P = 0;
    let W = 0;
    let x = 0;
    let z = null;
    do {
      let K = new URL(`${e.sessionBaseUrl}${n}`);
      for (let [key, value] of Object.entries(s)) K.searchParams.set(key, value);
      if (U) {
        K.searchParams.set("cursor", U);
        K.searchParams.delete("after_event_id");
      }
      let Y = !U && s.after_event_id !== undefined;
      let R;
      let B = await CCRClient.getWithRetry(
        e,
        K.toString(),
        authHeaders,
        r,
        (L) => {
          S++;
          z ??= L.headers.get("content-encoding");
          let I = L.headers.get("content-length");
          if (I !== null && x !== null) x += Number(I);
          else x = null;
        },
        (L, I) => {
          if (!Y) return;
          if (L === 400) R = "rejected";
          else if (I === "after_event_id_not_found") R = "not-found";
        },
        w === undefined
          ? O
          : {
              ...O,
              unencoded: !w.takesCompressedPages,
              readBody: async (L) => {
                let I = L.headers.get("content-encoding");
                if (!w.takesCompressedPages && I !== null && I !== "identity") {
                  await L.body?.cancel();
                  return {
                    encodedBody: true,
                  };
                }
                let bodyCapped = await readBodyCapped(L, w.maxBytes - W);
                if (bodyCapped === null)
                  return {
                    pastMaxBytes: true,
                  };
                let X = w.parsePage ? await w.parsePage(bodyCapped.text) : jsonParse(bodyCapped.text);
                if (!isPlainObject(X) || !Array.isArray(X.data) || !X.data.every(isPlainObject))
                  throw Error("CCRClient: a page is no list of events");
                W += bodyCapped.bytes;
                return X;
              },
            },
      );
      if (B?.encodedBody)
        return {
          events: [],
          stats: {
            pageCount: S,
            bytesReceived: x,
            contentEncoding: z ?? "none",
          },
          encodedBody: true,
        };
      if (!B) {
        if (R) {
          logForDebugging(
            `CCRClient: after_event_id ${R === "rejected" ? "rejected by server (gate off)" : "not found (stale anchor)"} \u2014 refetching without anchor`,
            {
              level: "warn",
            },
          );
          logForDiagnosticsNoPII(
            "warn",
            R === "rejected" ? "cli_worker_after_event_id_rejected" : "cli_worker_after_event_id_not_found",
            {
              context: r,
            },
          );
          let { after_event_id: afterEventId, ...I } = s;
          let G = await CCRClient.paginatedGet(e, n, I, r, h, w);
          if (!G) return null;
          return {
            ...G,
            anchorFallback: R,
          };
        }
        return null;
      }
      for (let L of B.data ?? []) if (!isClassifierDumpEvent(L.payload)) C.push(normalizePayload(L));
      P += Math.max(1, B.data?.length ?? 0);
      if (
        (v && B.next_cursor) ||
        (w !== undefined &&
          (P > w.maxEvents ||
            B.pastMaxBytes === true ||
            (B.data ?? []).some((L) => !isTimestampWithinLimit(L, w.maxTimestampChars))))
      )
        return {
          events: [],
          stats: {
            pageCount: S,
            bytesReceived: x,
            contentEncoding: z ?? "none",
          },
          overBound: true,
        };
      U = B.next_cursor;
    } while (U);
    logForDebugging(
      `CCRClient: Read ${C.length} internal events from ${n}${s.subagents ? " (subagents)" : ""}`,
    );
    return {
      events: C,
      stats: {
        pageCount: S,
        bytesReceived: x,
        contentEncoding: z ?? "none",
      },
    };
  }
  static getWithRetry(e, n, s, r, h, w, v = {}) {
    return CCRClient.getWithRetryNow(e, n, s, r, h, w, v);
  }
  static async getWithRetryNow(
    e,
    n,
    s,
    context,
    h,
    w,
    { maxAttempts = DEFAULT_MAX_ATTEMPTS, signal, readBody, unencoded, postJson, permanentStatuses },
  ) {
    let P = 0;
    for (let j = 1; j <= maxAttempts; j++) {
      if (signal?.aborted) return null;
      let x;
      try {
        x = await proxyAwareFetch(
          n,
          {
            ...(postJson !== undefined && {
              method: "POST",
              body: postJson,
            }),
            headers: {
              ...s,
              ...(postJson !== undefined && {
                "Content-Type": "application/json",
              }),
              "anthropic-version": "2023-06-01",
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
              ...(unencoded && {
                "Accept-Encoding": "identity",
              }),
            },
            ...(unencoded && {
              decompress: false,
            }),
            signal: signal
              ? AbortSignal.any([AbortSignal.timeout(30000), signal])
              : AbortSignal.timeout(30000),
            ...getProxyFetchOptions({
              url: n,
            }),
          },
          e.ownConnectionPool,
        );
        if (x.ok) {
          let K = readBody ? await readBody(x) : await x.json();
          h?.(x);
          return K;
        }
      } catch (error) {
        if (signal?.aborted) return null;
        logForDebugging(`CCRClient: GET ${n} failed (attempt ${j}/${maxAttempts}): ${errorMessage(error)}`, {
          level: "warn",
        });
        if (error instanceof RangeError && ++P >= RETRY_COUNT_3) break;
        if (j < maxAttempts) {
          let Y = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
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
        if (e.isClosed?.()) {
          await drainResponseBody(x);
          return null;
        }
        let conflictReason = await readConflictReason(x);
        if (e.isClosed?.()) return null;
        if (conflictReason === undefined && signal?.aborted) {
          logForDebugging(
            `CCRClient: GET ${n} returned 409 after its caller ended the read; its reason was not read, so the next request's 409 decides`,
            {
              level: "warn",
            },
          );
          return null;
        }
        e.onConflict?.(conflictReason);
        return null;
      } else await drainResponseBody(x);
      if (
        isClientErrorStatus(x.status) ||
        z === "after_event_id_not_found" ||
        permanentStatuses?.includes(x.status) === true
      ) {
        logForDebugging(`CCRClient: GET ${n} returned ${x.status} \u2014 permanent, not retrying`, {
          level: "warn",
        });
        w?.(x.status, z);
        return null;
      }
      logForDebugging(`CCRClient: GET ${n} returned ${x.status} (attempt ${j}/${maxAttempts})`, {
        level: "warn",
      });
      if (j < maxAttempts) {
        let K = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
        await sleep(K, signal);
      }
    }
    logForDebugging("CCRClient: GET retries exhausted", {
      level: "error",
    });
    logForDiagnosticsNoPII("error", "cli_worker_get_retries_exhausted", {
      context,
    });
    return null;
  }
  reportDelivery(e, n, s, r) {
    if (
      s !== undefined &&
      this.flushPolicy?.holdAcrossModelCalls &&
      this.waitingAnswers.some(isTopLevelSystemInit)
    )
      this.sendWaitingAnswers();
    if (
      !this.housekeepingRequestIds.has(e) &&
      (n === "processing" || (n === "received" && !r?.controlTraffic))
    ) {
      this.turnTookInput = true;
      this.liveOnlyRequestingRow = undefined;
    }
    if (n === "received") {
      this.lastInboundEventAtMs = Date.now();
      let O = r?.controlTraffic === true && this.flushPolicy?.controlTrafficKeepsHold === true;
      this.setHasSubscribers(undefined, O ? "reset" : "watcher");
      if (this.holdsAcrossModelCalls() && !O) {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        this.internalEventUploader.release("event", "inbound_event");
        this.releaseClientEvents("event", "inbound_event");
      }
      if (s !== undefined) {
        this.holdsNoMoreThisTurn = true;
        this.inboundMessageUuids.add(s);
        let C = this.inboundMessageUuids.values().next().value;
        if (this.inboundMessageUuids.size > MAX_INBOUND_MESSAGE_UUIDS && C !== undefined)
          this.inboundMessageUuids.delete(C);
      }
    }
    let h = n !== "received" && this.inboundMessageUuids.delete(e);
    if (n === "processing") {
      if (this.closed) return;
      if (h && this.receiptsMayRide()) this.messagesInProcessing.add(e);
      let O = this.pendingProcessingAcks.push(e) === 1;
      if (this.pickupTakesTick) return;
      if (h && this.holdsAcrossModelCalls() && this.turnHold !== "open") {
        this.pickupTakesTick = true;
        this.endWholeTurnHold();
        this.ackPickupBehindWrittenRows().catch(logError);
      } else if (O)
        queueMicrotask(() => {
          if (!this.pickupTakesTick) this.sendProcessingAcks(this.pendingProcessingAcks);
        });
      return;
    }
    let w = this.waitingReceipts.has(e);
    let v =
      n === "processed" &&
      this.messagesInProcessing.delete(e) &&
      !this.closed &&
      this.receiptsMayRide() &&
      normalizeUuidOrNull(e) !== null &&
      (this.resultPostWaits !== undefined || this.liveViewLaneSendsMore());
    if (this.messagesInProcessing.size === 0) this.resultPostWaits?.();
    let y =
      (v ||
        (n === "received" &&
          (r?.settingsRequest || (s !== undefined && this.flushPolicy?.messagesReceivedWaits)))) &&
      !this.closed &&
      this.followsServedPolicy
        ? (this.flushPolicy?.settingsReceiptsMaxWaitMs ?? 0)
        : 0;
    if (!w && y <= 0) {
      this.queueDeliveryAcks([
        ...this.takeWaitingReceipts(isProcessedReceipt),
        {
          eventId: e,
          status: n,
        },
      ]);
      return;
    }
    if (!w || n === "processed") this.waitingReceipts.set(e, n);
    if (v) this.receiptsRide ??= Promise.withResolvers();
    this.waitingReceiptsTimer ??= setTimeout(() => this.sendWaitingReceipts(), y);
  }
  receiptsMayRide() {
    return (
      this.flushPolicy?.receiptsRideUploads === true &&
      this.flushPolicy.settingsReceiptsMaxWaitMs > 0 &&
      !this.receiptsRideRefused &&
      this.followsServedPolicy
    );
  }
  takeWaitingReceipts(e = () => true) {
    let mapped = [...this.waitingReceipts]
      .filter(([s, r]) => e(s, r))
      .map(([s, r]) => ({
        eventId: s,
        status: r,
      }));
    for (let { eventId } of mapped) this.waitingReceipts.delete(eventId);
    if (this.waitingReceipts.size === 0) {
      clearTimeout(this.waitingReceiptsTimer);
      this.waitingReceiptsTimer = undefined;
    }
    if (![...this.waitingReceipts.values()].includes("processed")) {
      this.receiptsRide?.resolve();
      this.receiptsRide = undefined;
    }
    return mapped;
  }
  sendWaitingReceipts(e) {
    this.queueDeliveryAcks(this.takeWaitingReceipts(e));
  }
  queueDeliveryAcks(e) {
    let n = !this.deliveryUploader.hasRoomFor(e.length);
    let s = this.deliveryUploader.enqueue(e);
    if (n) {
      this.deliveryAcksWaitingForRoom.add(s);
      s.finally(() => this.deliveryAcksWaitingForRoom.delete(s));
    }
  }
  async sendProcessingAcks(e) {
    let n = e.splice(0);
    if (this.closed || n.length === 0) return;
    let s = this.takeWaitingReceipts(isProcessedReceipt);
    if (
      (
        await this.request(
          "post",
          "/worker/events/delivery",
          {
            worker_epoch: this.workerEpoch,
            updates: [
              ...n.map((eventId) => ({
                event_id: eventId,
                status: "processing",
              })),
              ...s.map((h) => ({
                event_id: h.eventId,
                status: h.status,
              })),
            ],
          },
          "processing ack",
        )
      ).ok
    )
      this.takeWaitingReceipts((h, w) => w === "received" && n.includes(h));
    else this.queueDeliveryAcks(s);
  }
  async ackPickupBehindWrittenRows() {
    this.sendWaitingAnswers();
    let promise = this.pickupBarriers.at(-1)?.opened.promise;
    let n = {
      opened: Promise.withResolvers(),
      writes: [],
      eventIds: [],
    };
    this.pickupBarriers.push(n);
    let s;
    try {
      await Promise.resolve();
      n.eventIds = this.pendingProcessingAcks.splice(0);
      this.pickupTakesTick = false;
      await promise;
      if (this.pickupBarriers.includes(n))
        s = await withDeadline(this.storeWrittenRowsThenAck(n.eventIds), this.pickupWaitMs);
      else {
        s = true;
        await this.sendProcessingAcks(n.eventIds);
      }
    } finally {
      let index = this.pickupBarriers.indexOf(n);
      this.openPickupBarriers(index < 0 || s ? index + 1 : this.pickupBarriers.length);
    }
  }
  async storeWrittenRowsThenAck(e) {
    this.internalEventUploader.release("event", "pickup");
    await this.flush();
    await this.sendProcessingAcks(e);
    return true;
  }
  openPickupBarriers(e) {
    for (let pickupBarrier of this.pickupBarriers.splice(0, e)) {
      this.sendProcessingAcks(pickupBarrier.eventIds).catch(logError);
      for (let { messages, opts, written } of pickupBarrier.writes)
        this.writeEventsNow(messages, opts).then(written.resolve, written.reject);
      pickupBarrier.opened.resolve();
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
    return flushPolicy !== undefined && this.servedPolicyHolds()
      ? {
          holdsAcrossModelCalls: flushPolicy.holdAcrossModelCalls,
          maxAgeMs: flushPolicy.maxAgeMs,
          maxEvents: flushPolicy.maxEvents,
          counts: this.uploadHoldTally.counts,
        }
      : undefined;
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
    let n = this.countRowsAwaitingCompactSummary();
    for (let key of this.rowsAwaitingCompactSummary.keys()) this.takeRowsAwaitingCompactSummary(key, "close");
    this.rowsAwaitingCompactSummaryAtClose ??= n;
    this.logUndeliveredAtClose("internal_events", this.internalEventUploader.close() + n);
  }
  flushGoodbye() {
    return this.goodbyeFlushed;
  }
  closeExceptInternalEvents(e) {
    this.sendWaitingAnswers();
    this.openPickupBarriers(this.pickupBarriers.length);
    let closed = this.closed;
    this.closed = true;
    this.giveBackRidingRows();
    this.workerSocket?.usePostFromNowOn();
    this.closeAbort.abort();
    this.closingForSuccessor = e?.retainUndeliveredClientEvents === true;
    let s = this.takeParkedRows();
    if (s.length > 0) this.eventUploader.enqueue(s);
    if (e?.keepWaitingWorkerMetadata === true) this.workerState.closeToNewPatches();
    else this.workerState.close();
    if (!closed && e?.goodbye !== false) this.sendGoodbye();
    this.stopHeartbeat();
    this.clearProbeBeatTimer();
    if (this.viewerCheckpointTimer) {
      clearTimeout(this.viewerCheckpointTimer);
      this.viewerCheckpointTimer = null;
    }
    this.unsubscribeIdleTracker?.();
    clearActivityCallback();
    this.stopWorkStartKeepAlive?.();
    this.stopToolCallGate?.();
    for (let toolCallRowWaiter of this.toolCallRowWaiters.values())
      for (let h of toolCallRowWaiter) h.reached();
    this.toolCallRowWaiters.clear();
    if (this.streamEventTimer) {
      clearTimeout(this.streamEventTimer);
      this.streamEventTimer = null;
    }
    if (this.firstDeltaFlushTimer) {
      clearTimeout(this.firstDeltaFlushTimer);
      this.firstDeltaFlushTimer = null;
    }
    this.streamEventBuffer = [];
    this.pendingProcessingAcks = [];
    if (this.receiptsRide) this.sendWaitingReceipts(isProcessedReceipt);
    clearTimeout(this.waitingReceiptsTimer);
    if (e?.keepClientEvents !== true)
      this.logUndeliveredAtClose(
        "client_events",
        this.eventUploader.close({
          retainUndelivered: e?.retainUndeliveredClientEvents === true,
        }),
      );
    this.deliveryUploader.close();
  }
  registerShutdownCleanup(
    e = {
      registerCleanup,
      registerPreExitFlush,
    },
    n = CCR_RETRY_DELAY_MS,
  ) {
    e.registerCleanup(() => this.beginShutdown());
    e.registerPreExitFlush(() => this.finishShutdown(n));
  }
  beginShutdown() {
    this.shutdownBeganAtMs = performance.now();
    this.owedMetadataDropsAtShutdown = this.droppedOwedMetadataPatchCount;
    this.sendWaitingReceipts();
    try {
      let followsServedPolicy = !this.closed && this.currentState === "running" && this.followsServedPolicy;
      this.shutdownKeepsClientEvents = followsServedPolicy || (!this.closed && this.servedPolicyHolds());
      if (this.shutdownKeepsClientEvents) {
        this.shutdownReleased = true;
        this.applyUploadHold("shutdown");
      }
    } finally {
      this.closeExceptInternalEvents({
        keepClientEvents: this.shutdownKeepsClientEvents,
        keepWaitingWorkerMetadata: true,
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
            : undefined,
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
      this.close();
      this.onInternalEventLaneClosed?.();
      await flushDiagnosticLogs().catch(() => {});
    }
  }
  flushEventLanesAtShutdown() {
    return Promise.allSettled([
      this.flushInternalEvents(),
      this.shutdownKeepsClientEvents ? this.flush() : undefined,
    ]);
  }
}
//@ chunk-fp6aqx1j.js:134287-134299 layout
var CCR_RETRY_DELAY_MS = 3000;
//@ chunk-fp6aqx1j.js:134299-134457 layout
function blockedToNeedInput(e) {
  let postTurnSummary = e.post_turn_summary;
  if (!hasStatusCategory(postTurnSummary) || postTurnSummary.status_category !== "blocked") return e;
  return {
    ...e,
    post_turn_summary: {
      ...postTurnSummary,
      status_category: "need_input",
    },
  };
}
//@ chunk-fp6aqx1j.js:134457-134569 layout
function hasStatusCategory(postTurnSummary) {
  return (
    postTurnSummary !== null &&
    typeof postTurnSummary === "object" &&
    "status_category" in postTurnSummary &&
    typeof postTurnSummary.status_category === "string"
  );
}
//@ chunk-fp6aqx1j.js:134569-134772 layout
async function readConflictReason(e) {
  let n = asConflictReason(e.headers.get("x-ccr-conflict-reason"));
  if (n !== undefined) {
    await drainResponseBody(e);
    return n;
  }
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
  let n = WorkerLimitsSchema().safeParse(e);
  if (!n.success) return;
  let s = n.data;
  let r = s.hold_across_model_calls === true;
  let h = clampNonNegativeInt(s.max_age_ms, r ? MAX_HOLD_AGE_MS : DEFAULT_MAX_HOLD_AGE_MS);
  let w =
    h > 0
      ? clampNonNegativeInt(s.max_events, r ? DEFAULT_MAX_HOLD_EVENTS_ACROSS_CALLS : DEFAULT_MAX_HOLD_EVENTS)
      : 0;
  let v = clampNonNegativeInt(s.max_bytes, DEFAULT_MAX_HOLD_BYTES);
  let y = r ? 0 : clampNonNegativeInt(s.transcript_max_age_ms, DEFAULT_TRANSCRIPT_MAX_AGE_MS);
  let transcriptMaxAgeMs = y > h ? y : 0;
  let C = clampNonNegativeInt(s.no_turn_max_age_ms, h);
  let policyVersion = s.policy_version ?? undefined;
  return {
    maxEvents: w,
    maxAgeMs: h,
    maxBytes: v > 0 ? v : undefined,
    flushOnSamplingEnd: s.flush_on_sampling_end === true && !r,
    flushOnAssistant: s.flush_on_assistant === true,
    eventBatchUpload: s.event_batch_upload === true,
    holdAcrossModelCalls: r,
    holdAgain:
      r && s.hold_again
        ? {
            softAgeMs: clampNonNegativeInt(s.hold_again.soft_age_ms, h),
            softEvents: clampNonNegativeInt(s.hold_again.soft_events, w),
            after: new Set((s.hold_again.after ?? []).slice(0, MAX_MUST_FLUSH_TYPES)),
            neverAfterTools: new Set(
              (s.hold_again.never_after_tools ?? []).slice(0, MAX_HOLD_AGAIN_TOOL_NAMES),
            ),
            toolsWhoseResultsWait: s.hold_again.tools_whose_results_wait
              ? new Set(s.hold_again.tools_whose_results_wait.slice(0, MAX_HOLD_AGAIN_TOOL_NAMES))
              : undefined,
            laterWorkerHoldsFirstTurn:
              s.hold_again.later_worker_holds_first_turn === true &&
              s.live_twin_types?.includes("system/status") === true,
          }
        : undefined,
    mayWaitTypes: new Set((s.may_wait_types ?? []).filter((S) => MAY_WAIT_EVENT_TYPES.has(S))),
    mayWaitTypesRefused: count(s.may_wait_types ?? [], (S) => !MAY_WAIT_EVENT_TYPES.has(S)),
    settingsReceiptsMaxWaitMs: clampNonNegativeInt(
      s.settings_receipts_max_wait_ms,
      DEFAULT_SETTINGS_RECEIPTS_MAX_WAIT_MS,
    ),
    messagesReceivedWaits: s.messages_received_waits === true,
    receiptsRideUploads: s.receipts_ride_uploads === true,
    flushBeforeToolsWaitMs: clampNonNegativeInt(
      s.flush_before_tools_wait_ms,
      DEFAULT_FLUSH_BEFORE_TOOLS_WAIT_MS,
    ),
    flushAfterTools: FLUSH_AFTER_TOOLS_MODES.find((S) => S === s.flush_after_tools) ?? "none",
    flushAfterToolNames: new Set((s.flush_after_tool_names ?? []).slice(0, MAX_HOLD_AGAIN_TOOL_NAMES)),
    mustFlushTypes: new Set((s.must_flush_types ?? []).slice(0, MAX_MUST_FLUSH_TYPES)),
    liveTwinTypes: new Set(
      (s.live_twin_types ?? []).filter((S) => !S.startsWith("control_")).slice(0, MAX_LIVE_TWIN_TYPES),
    ),
    liveOnlyTypes: new Set((s.live_only_types ?? []).filter((S) => LIVE_ONLY_EVENT_TYPES.has(S))),
    transcriptMaxAgeMs,
    noTurnMaxAgeMs: C < h ? C : 0,
    mergeWorkerReports: s.merge_worker_reports === true,
    controlTrafficKeepsHold: r && s.control_traffic_keeps_hold === true,
    emptyCheckpointKeepsHold: r && s.empty_checkpoint_keeps_hold === true,
    firstTurnHoldsEachCall: r && s.first_turn_holds_each_call === true,
    settingsAnswersMaxWaitMs: clampNonNegativeInt(
      s.settings_answers_max_wait_ms,
      DEFAULT_SETTINGS_ANSWER_WAIT_MS,
    ),
    initMaxWaitMs: clampNonNegativeInt(s.init_max_wait_ms, DEFAULT_SETTINGS_ANSWER_WAIT_MS),
    metadataWaitsForStatus: new Set(
      (s.metadata_waits_for_status ?? []).filter((S) => STATUS_METADATA_KEYS_ALL.has(S)),
    ),
    metadataNeverSent: new Set(
      (s.metadata_never_sent ?? []).filter((S) => STATUS_PAYLOAD_METADATA_KEYS.has(S)),
    ),
    metadataMaxWaitMs: clampNonNegativeInt(s.metadata_max_wait_ms, MAX_HOLD_AGE_MS),
    costReportMaxWaitMs: clampNonNegativeInt(s.cost_report_max_wait_ms, DEFAULT_COST_REPORT_MAX_WAIT_MS),
    policyVersion:
      policyVersion !== undefined && POLICY_VERSION_PATTERN.test(policyVersion) ? policyVersion : undefined,
  };
}
//@ chunk-fp6aqx1j.js:137300-137376 layout
function normalizePayload(e) {
  let n = normalizeUserToolUseResult(e.payload);
  return n === e.payload
    ? e
    : {
        ...e,
        payload: n,
      };
}
//@ chunk-fp6aqx1j.js:137376-137544 layout
function hasUserMessageUuids(e) {
  return (
    "user_message_uuids" in e &&
    Array.isArray(e.user_message_uuids) &&
    e.user_message_uuids.length > 0 &&
    e.user_message_uuids.every((userMessageUuid) => typeof userMessageUuid === "string")
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
var SDK_ROW_TYPES = new Set(["assistant", "attachment", "result", "system", "user"]);
//@ chunk-fp6aqx1j.js:137740-137913 placement
function describeSingleRowForTelemetry(e) {
  let payload = e.length === 1 ? e[0].payload : undefined;
  return (
    payload && {
      row_type: SDK_ROW_TYPES.has(payload.type) ? payload.type : "other",
      row_has_tool_result: hasToolResultContent(payload.message),
      row_bytes: Buffer.byteLength(jsonStringify(payload)),
    }
  );
}
//@ chunk-fp6aqx1j.js:137913-138447 placement
/**
 * 把一条 SDK 行归类为遥测用的 type/subtype 字符串；前台 shell 任务开始与 rate_limit_event（带 grace/overage 后缀）有专门分类。
 */
function classifyRowTypeForTelemetry(message) {
  if (
    message.type === "system" &&
    message.subtype === "task_started" &&
    message.task_type === "local_bash" &&
    message.is_backgrounded === false &&
    !("owned_by_subagent" in message && message.owned_by_subagent)
  )
    return "system/task_started_foreground_shell";
  if (message.type === "rate_limit_event") {
    let rateLimitInfo = message.rate_limit_info;
    if (!isPlainObject(rateLimitInfo) || typeof rateLimitInfo.status !== "string") return message.type;
    let s =
      rateLimitInfo.rateLimitGraceActive === true
        ? "_grace"
        : rateLimitInfo.overageInUse === true || rateLimitInfo.isUsingOverage === true
          ? "_overage"
          : "";
    return `${message.type}/${rateLimitInfo.status}${s}`;
  }
  return "subtype" in message && typeof message.subtype === "string"
    ? `${message.type}/${message.subtype}`
    : message.type;
}
//@ chunk-fp6aqx1j.js:138447-138557 placement
function hasToolResultContent(message) {
  let content = isPlainObject(message) ? message.content : undefined;
  return Array.isArray(content) && content.some((s) => isPlainObject(s) && s.type === "tool_result");
}
//@ chunk-fp6aqx1j.js:138557-138595 placement
var READ_NOTIFICATIONS_TOOL_NAMES = new Set(["ReadNotifications"]);
//@ chunk-fp6aqx1j.js:138595-138709 placement
function getMainThreadToolUseIds(e, n) {
  return isPlainObject(e) && e.type === "assistant" && e.parent_tool_use_id == null
    ? collectContentBlockField(e.message, "tool_use", "id", n)
    : [];
}
//@ chunk-fp6aqx1j.js:138709-138941 placement
function collectContentBlockField(message, n, s, r) {
  let content = isPlainObject(message) ? message.content : undefined;
  if (!Array.isArray(content)) return [];
  let w = [];
  for (let v of content)
    if (
      isPlainObject(v) &&
      v.type === n &&
      (r === undefined || (typeof v.name === "string" && r.has(v.name)))
    ) {
      let y = v[s];
      if (typeof y === "string") w.push(y);
    }
  return w;
}
//@ chunk-fp6aqx1j.js:138941-139051 placement = createChildAbortController (0.879)
function createChildAbortController(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) resolve();
    else
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
  });
}
//@ chunk-fp6aqx1j.js:139051-139135 placement
function evictOldestIfFull(e) {
  if (e.size > MAX_EPHEMERAL_RECEIPT_IDS) {
    let n = e.keys().next().value;
    if (n !== undefined) e.delete(n);
  }
}
//@ chunk-fp6aqx1j.js:139135-139239 placement
function clampNonNegativeInt(e, n) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(0, Math.trunc(e)), n) : 0;
}
//@ chunk-fp6aqx1j.js:139239-141177 placement
function summarizeAssistantMessage(flushPolicy, n) {
  if (!flushPolicy || !n) return flushPolicy === n;
  return (
    flushPolicy.maxEvents === n.maxEvents &&
    flushPolicy.maxAgeMs === n.maxAgeMs &&
    flushPolicy.maxBytes === n.maxBytes &&
    flushPolicy.flushOnSamplingEnd === n.flushOnSamplingEnd &&
    flushPolicy.flushOnAssistant === n.flushOnAssistant &&
    flushPolicy.eventBatchUpload === n.eventBatchUpload &&
    flushPolicy.holdAcrossModelCalls === n.holdAcrossModelCalls &&
    flushPolicy.holdAgain?.softAgeMs === n.holdAgain?.softAgeMs &&
    flushPolicy.holdAgain?.softEvents === n.holdAgain?.softEvents &&
    setsEqual(flushPolicy.holdAgain?.after, n.holdAgain?.after) &&
    setsEqual(flushPolicy.holdAgain?.neverAfterTools, n.holdAgain?.neverAfterTools) &&
    setsEqual(flushPolicy.holdAgain?.toolsWhoseResultsWait, n.holdAgain?.toolsWhoseResultsWait) &&
    flushPolicy.holdAgain?.laterWorkerHoldsFirstTurn === n.holdAgain?.laterWorkerHoldsFirstTurn &&
    setsEqual(flushPolicy.mayWaitTypes, n.mayWaitTypes) &&
    setsEqual(flushPolicy.liveOnlyTypes, n.liveOnlyTypes) &&
    setsEqual(flushPolicy.flushAfterToolNames, n.flushAfterToolNames) &&
    flushPolicy.settingsReceiptsMaxWaitMs === n.settingsReceiptsMaxWaitMs &&
    flushPolicy.messagesReceivedWaits === n.messagesReceivedWaits &&
    flushPolicy.receiptsRideUploads === n.receiptsRideUploads &&
    flushPolicy.flushBeforeToolsWaitMs === n.flushBeforeToolsWaitMs &&
    flushPolicy.flushAfterTools === n.flushAfterTools &&
    flushPolicy.mergeWorkerReports === n.mergeWorkerReports &&
    flushPolicy.transcriptMaxAgeMs === n.transcriptMaxAgeMs &&
    flushPolicy.noTurnMaxAgeMs === n.noTurnMaxAgeMs &&
    flushPolicy.controlTrafficKeepsHold === n.controlTrafficKeepsHold &&
    flushPolicy.emptyCheckpointKeepsHold === n.emptyCheckpointKeepsHold &&
    flushPolicy.firstTurnHoldsEachCall === n.firstTurnHoldsEachCall &&
    flushPolicy.settingsAnswersMaxWaitMs === n.settingsAnswersMaxWaitMs &&
    flushPolicy.initMaxWaitMs === n.initMaxWaitMs &&
    flushPolicy.policyVersion === n.policyVersion &&
    flushPolicy.mustFlushTypes.size === n.mustFlushTypes.size &&
    [...flushPolicy.mustFlushTypes].every((mustFlushType) => n.mustFlushTypes.has(mustFlushType)) &&
    flushPolicy.liveTwinTypes.size === n.liveTwinTypes.size &&
    [...flushPolicy.liveTwinTypes].every((liveTwinType) => n.liveTwinTypes.has(liveTwinType)) &&
    flushPolicy.metadataMaxWaitMs === n.metadataMaxWaitMs &&
    flushPolicy.costReportMaxWaitMs === n.costReportMaxWaitMs &&
    flushPolicy.metadataWaitsForStatus.size === n.metadataWaitsForStatus.size &&
    [...flushPolicy.metadataWaitsForStatus].every((s) => n.metadataWaitsForStatus.has(s)) &&
    setsEqual(flushPolicy.metadataNeverSent, n.metadataNeverSent)
  );
}
//@ chunk-fp6aqx1j.js:141177-141418 placement
function parseFlushIntervalMs(e, n, s) {
  let r = typeof n === "string" ? Number(n) : n;
  if (typeof r === "number" && Number.isFinite(r)) return Math.min(Math.max(r, 0), 60000);
  if (n !== undefined)
    logForDebugging(`CCRClient: non-finite ${e} (${typeof n}) \u2014 using ${s}ms`, {
      level: "warn",
    });
  return s;
}
//@ chunk-fp6aqx1j.js:141418-141504 placement
function isThinkingTokensSystemMessage(e) {
  return e.type === "system" && "subtype" in e && e.subtype === "thinking_tokens";
}
//@ chunk-fp6aqx1j.js:141504-141867 placement
/**
 * 判断一条 SDK 消息是否属于实时/进度类（user、stream_event、tool_progress、不含 SendUserMessage/PushNotification 的 assistant、thinking_tokens/task_progress/hook_progress 系统消息），决定 CCRClient 的保留与刷写策略。
 */
function isEphemeralStreamMessage(e) {
  switch (e.type) {
    case "user":
    case "stream_event":
    case "tool_progress":
      return true;
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
      return false;
  }
}
//@ chunk-fp6aqx1j.js:141867-141925 placement
function hearthQuerySuffix(e) {
  if (e) return "?include_hearth=true";
  return "";
}
//@ chunk-fp6aqx1j.js:141925-141957 placement
function isHearthRequest(e) {
  return e?.hearth;
}
//@ chunk-fp6aqx1j.js:141957-142022 placement
function isHistoricalPayloadSeen(e, n) {
  return e.historical === true && n.has(e.payload.uuid);
}
//@ chunk-fp6aqx1j.js:142022-142068 placement
function isUserPayload(e) {
  return e.payload.type === "user";
}
//@ chunk-fp6aqx1j.js:142068-142330 placement
/**
 * 创建空闲跟踪器：noteActivity 记录活动并通知订阅者，sampleIdleSeconds 在回合运行时返回 0，否则返回距上次活动的秒数；用于 CCR 心跳的 idle 上报。
 */
function createIdleTracker(e) {
  let n = e?.isTurnRunning ?? (() => getMainLoopRefcount() > 0);
  let signal = createSignal();
  let now = Date.now();
  return {
    noteActivity() {
      now = Date.now();
      try {
        signal.emit();
      } catch (error) {
        logError(error);
      }
    },
    sampleIdleSeconds() {
      let now_2 = Date.now();
      if (n()) {
        now = now_2;
        return 0;
      }
      return Math.max(0, Math.floor((now_2 - now) / 1000));
    },
    onActivity: signal.subscribe,
  };
}
//@ chunk-3wek6r2k.js:29172-29300 fingerprint = scopeKey (0.642)
/**
 * 构造一条 replay 用户消息（isReplay）。
 */
function scopeKey(sessionId, uuid, content) {
  return {
    type: "user",
    uuid,
    session_id: sessionId,
    isReplay: true,
    parent_tool_use_id: null,
    message: {
      role: "user",
      content,
    },
  };
}
export {
  SETTINGS_CONTROL_SUBTYPES,
  isEphemeralStreamMessage,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  createIdleTracker,
  MAX_PRESERVED_MESSAGE_UUIDS,
  scopeKey,
  CCRClient,
  WORKER_CONFLICT_CLOSE_CODES,
  isUserPayload,
  findLastRowBeforeSpans,
  selectRowsToResend,
  MAX_ROW_AGE_MS,
  CCRInitError,
  isWorkerRegisterFailure,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  workerEpochFromEnv,
  TENGU_PATIENT_LEDGER,
};
