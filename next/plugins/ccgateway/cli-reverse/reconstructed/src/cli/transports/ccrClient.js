/**
 * cli/transports/ccrClient.ts
 *
 * CCR（云会话）worker 客户端：事件批量上传、状态、心跳、投递确认与流事件处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/ccrClient.ts
 * pieces: chunk-hjswk319.js (1), chunk-qyz2x025.js (95)
 * attribution: fingerprint 3, placement 73, layout 13, affinity 4, sole-consumer 2, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { countWhere, setsEqual } from "../../utils/collections.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_FRAME_BYTES, findCoalescedRunHead, coalesceStreamEvents } from "./streamEventCoalescing.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isKnownContentBlockType } from "../../services/api/requestHeaders.js";
import { coalescePatches } from "./WorkerStateUploader.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../../services/remoteTools/remoteToolsDebug.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  objectSchema,
  stringSchema,
  looseObject,
  record,
  unknown,
  booleanSchema,
  array,
  literal,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { requestIdOf } from "../../utils/sessionState.js";
import { buildRequiresActionDetails } from "../structuredIO.js";
import {
  MAX_LIVE_RESPONSE_BYTES,
  capLiveOnlyResponseSize,
  isLiveOnlyResponse,
} from "../../bridge/controlRequests.js";
import { env } from "../../utils/env.js";
import { isSelfHostedRemoteEnvironment, isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { getSessionIngressAuthHeaders, getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { convertWsUrlToPostUrl } from "./HybridTransport.js";
import { logForDiagnosticsNoPII, flushDiagnosticLogs } from "../../utils/diagLogs.js";
import {
  ClientEventUploader,
  ClientEventUploadError,
  ClientEventBatchRejectedError,
  ClientEventResendSoonError,
  ClientEventTooSmallError,
} from "../../utils/telemetry/clientEventUploader.js";
import { dedupeEventsByUuid } from "../../utils/teleport/api.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  isAssistantWithMessageId,
  withholdFileBodiesDeep,
  stripInlineMediaBase64,
  dedupeMcpImageData,
  stripTranscriptOnlyFields,
  normalizeUserToolUseResult,
} from "./ccrMessageMapping.js";
import { isRelayableControlFrame } from "../../remote/RemoteSessionManager.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  setActivityCallback,
  onWorkStarted,
  hasActiveWork,
  isActivityReasonActive,
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { retirePoolAfterNoAnswer } from "../../upstreamproxy/ccrPoolRetire.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { chunk_default } from "../../../vendor/lodash-es/chunk.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isClassifierDumpEvent } from "../../utils/teleport/autoModeDumps.js";
import { registerCleanup, registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { createSignal } from "../../utils/signal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:28509-28637 fingerprint (2.1.88 match: scopeKey, 0.641)
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
//@ chunk-qyz2x025.js:2067-2166 placement
var CCR_TICKET_HEADER_NAMES = ["x-ccr-ticket-rev", "x-ccr-ticket-session", "x-ccr-ticket-seq"];
var TICKET_VALUE_PATTERN = /^[A-Za-z0-9_-]{1,4096}$/;
//@ chunk-qyz2x025.js:2166-2603 placement
class TicketHeaders {
  authorization;
  held = new Map();
  headersFor(headers) {
    if (headers === undefined) return {};
    if (headers !== this.authorization) {
      this.held.clear();
      this.authorization = headers;
    }
    return Object.fromEntries(this.held);
  }
  note(kind, response) {
    if (kind === undefined || kind !== this.authorization) return;
    if (response.redirected || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
      this.held.clear();
      return;
    }
    for (let headerName of CCR_TICKET_HEADER_NAMES) {
      let value = response.headers.get(headerName);
      if (value === "") this.held.delete(headerName);
      else if (value !== null && TICKET_VALUE_PATTERN.test(value)) this.held.set(headerName, value);
    }
  }
}
//@ chunk-qyz2x025.js:2603-2613 placement
var MAX_REMEMBERED_ATTEMPTS = 64;
//@ chunk-qyz2x025.js:2613-3239 placement
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
  noteQueued(ids) {
    for (let id of ids) this.queuedSince.add(id);
  }
  noteAttempt(ids, startedAt, attemptStart) {
    let ahead = countWhere(ids, (id) => this.queuedSince.has(id));
    this.posts++;
    if (attemptStart) this.rows += ahead;
    else this.failedPosts++;
    if (this.attempts.length < MAX_REMEMBERED_ATTEMPTS)
      this.attempts.push({
        startedAt,
        endedAt: performance.now(),
        ahead: ahead === 0,
      });
  }
  seen(stamp) {
    let aheadMs = 0;
    let postMs = 0;
    for (let { startedAt, endedAt, ahead } of this.attempts) {
      let max = Math.max(0, endedAt - Math.max(startedAt, stamp));
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
//@ chunk-qyz2x025.js:3239-3252 placement
/**
 * 压缩边界 preservedMessages.uuids 最多保留 1536 个，超出截尾并同步裁剪 allUuids 与 headUuid。
 */
var MAX_PRESERVED_MESSAGE_UUIDS = 1536;
//@ chunk-qyz2x025.js:3252-3326 placement
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//@ chunk-qyz2x025.js:3326-3735 placement
/**
 * 压缩后的 boundary 行如果 preservedMessages.uuids 过多，只保留最后 n 个并同步裁剪 allUuids 与 preservedSegment.headUuid。
 */
function trimPreservedMessagesMetadata(metadata, max = MAX_PRESERVED_MESSAGE_UUIDS) {
  let compactMetadata = metadata.compactMetadata;
  if (!isPlainObject(compactMetadata)) return null;
  let preservedMessages = compactMetadata.preservedMessages;
  if (!isPlainObject(preservedMessages)) return null;
  let uuids = preservedMessages.uuids;
  if (!isStringArray(uuids) || uuids.length <= max) return null;
  let sliced = uuids.slice(-max);
  let first = sliced[0];
  let allUuids = preservedMessages.allUuids;
  let anchorIndex = isStringArray(allUuids) ? allUuids.indexOf(first) : -1;
  let preservedSegment = compactMetadata.preservedSegment;
  return {
    ...metadata,
    compactMetadata: {
      ...compactMetadata,
      preservedMessages: {
        ...preservedMessages,
        uuids: sliced,
        ...(isStringArray(allUuids) && {
          allUuids: anchorIndex >= 0 ? allUuids.slice(anchorIndex) : allUuids.slice(-max),
        }),
      },
      ...(isPlainObject(preservedSegment) && {
        preservedSegment: {
          ...preservedSegment,
          headUuid: first,
        },
      }),
    },
  };
}
//@ chunk-qyz2x025.js:3735-3772 layout
var REQUEST_FOLLOWS_INIT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qyz2x025.js:3735", () => {
  REQUEST_FOLLOWS_INIT = Symbol("requestFollowsInit");
});
//@ chunk-qyz2x025.js:3772-3835 placement
/**
 * 持久上传账本限额：重试次数小于 10 优先重发、未应答超过 1 万条清空停写、行龄与行字节上限。
 */
var TENGU_PATIENT_LEDGER = "tengu_patient_ledger";
var MAX_LEDGER_RETRIES = 10;
var MAX_UNANSWERED_ROWS = 1e4;
var MAX_ROW_AGE_MS = 400;
var MAX_ROW_BYTES = 2097152;
//@ chunk-qyz2x025.js:3835-3938 placement
function isIsoTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}
//@ chunk-qyz2x025.js:3938-4202 placement
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
//@ chunk-qyz2x025.js:4202-6944 placement
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
  workerRecordRead(key, rows) {
    if (key.readFailed === true) return;
    this.writes = true;
    this.startedAt = rows.toISOString();
    this.stampsCountFrom = rows.getTime();
    this.runOpenedAt = this.startedAt;
    let clientRowsOwedSpans = parseClientRowsOwedSpans(key.internal?.client_rows_owed);
    this.earlier = clientRowsOwedSpans.filter(
      (clientRowsOwedSpan) => clientRowsOwedSpan.tries < MAX_LEDGER_RETRIES,
    );
    this.spansGivenUpAtStart = clientRowsOwedSpans.length - this.earlier.length;
  }
  stateReported(state, rows, stamp) {
    if (this.runOpen === (state === "idle")) {
      this.runOpen = !this.runOpen;
      this.runOpenedAt = this.runOpen ? rows.toISOString() : this.runOpenedAt;
    }
    if (!stamp) return this.guardEnded(rows.getTime());
    return (
      (this.runOpen ? this.openOwnSpan(rows) : this.rowsAnswered([])) ??
      (this.writes && (this.own !== undefined || this.earlier.length > 0) ? this.note() : undefined)
    );
  }
  rowsEntered(rows, stamp) {
    let filtered = rows.filter((row) => getMainThreadTurnUuid(row) !== undefined);
    for (let row of filtered) this.unanswered.add(String(row.uuid));
    if (this.unanswered.size > MAX_UNANSWERED_ROWS) {
      this.unanswered.clear();
      this.writes = false;
    }
    if (filtered.length === 0) return;
    let min = Math.min(
      stamp.getTime(),
      ...filtered
        .flatMap((row) => (isIsoTimestamp(row.timestamp) ? [Date.parse(row.timestamp)] : []))
        .filter((time) => time >= this.stampsCountFrom),
    );
    if (this.own === undefined) return this.openOwnSpan(new Date(min));
    if (!this.writes || min >= Date.parse(this.own.since)) return;
    this.own = {
      ...this.own,
      since: new Date(min).toISOString(),
    };
    return this.note();
  }
  rowsAnswered(ids) {
    let hadResend = this.sentAgain.size > 0;
    for (let id of ids) {
      this.unanswered.delete(id);
      this.sentAgain.delete(id);
    }
    let settled = hadResend && this.sentAgain.size === 0;
    let allAnswered = this.own !== undefined && !this.runOpen && this.unanswered.size === 0;
    if (!this.writes || (!settled && !allAnswered)) return;
    this.earlier = settled ? [] : this.earlier;
    this.own = allAnswered ? undefined : this.own;
    return this.note();
  }
  guardEnded(reason) {
    this.guardLapsed = true;
    this.stampsCountFrom = reason;
    this.unanswered.clear();
    if (!this.writes || this.own === undefined) return;
    this.own = undefined;
    return this.note();
  }
  earlierSpansTried(spans) {
    return this.replaceEarlier(
      this.earlier.map((span) => ({
        ...span,
        until: span.until ?? spans ?? this.startedAt,
        tries: span.tries + 1,
      })),
    );
  }
  earlierRowsSentAgain(ids) {
    for (let id of ids) this.sentAgain.add(id);
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
  openOwnSpan(stamp) {
    if (!this.writes || this.own !== undefined) return;
    this.own = {
      since: this.guardLapsed
        ? stamp.toISOString()
        : new Date(Math.max(Date.parse(this.runOpenedAt), this.stampsCountFrom)).toISOString(),
      tries: 0,
    };
    this.guardLapsed = false;
    return this.note();
  }
  note() {
    let mapped = this.earlier.map((span) => ({
      ...span,
      until: span.until ?? this.startedAt,
    }));
    let spans = this.own ? [...mapped, this.own] : mapped;
    return {
      client_rows_owed:
        spans.length > 0
          ? {
              v: 1,
              spans,
            }
          : null,
    };
  }
}
//@ chunk-qyz2x025.js:6944-7194 placement
function getMainThreadTurnUuid(message) {
  let content = isPlainObject(message.message) ? message.message.content : undefined;
  return typeof message.uuid === "string" &&
    Array.isArray(content) &&
    message.isSidechain !== true &&
    !message.parent_tool_use_id &&
    (message.type === "assistant" ||
      (message.type === "user" &&
        content.some((block) => isPlainObject(block) && block.type === "tool_result")))
    ? message.uuid
    : undefined;
}
//@ chunk-qyz2x025.js:7194-8053 placement
function selectRowsToResend(fromUuid, rows, keep = () => true) {
  let reason = "nothing";
  let flattened = fromUuid.flatMap(({ since, until }) => {
    let index = rows.findIndex(isAtOrAfterTimestamp(since));
    let candidates = index < 0 ? [] : rows.slice(index);
    let endIndex =
      until === undefined
        ? -1
        : isIsoTimestamp(until)
          ? candidates.findIndex(isAtOrAfterTimestamp(until))
          : candidates.findIndex((row) => row.uuid === until) + 1;
    let toSend = endIndex < 0 ? candidates : candidates.slice(0, endIndex);
    if (
      (until !== undefined && !isIsoTimestamp(until) && !rows.some((row) => row.uuid === until)) ||
      toSend.some((row) => row.type === "system" && row.subtype === "compact_boundary")
    )
      reason = "rows_before_a_compaction";
    let out = [];
    for (let row of toSend) {
      let keepRow = getMainThreadTurnUuid(row) !== undefined && keep(row);
      if (keepRow === "nor_any_after_it") {
        reason = "reply_without_this_sessions_mark";
        break;
      }
      if (keepRow) out.push(row);
    }
    return out.length > 0 ? [out] : [];
  });
  let ids = new Set();
  for (let spanIds of flattened) {
    let from = 0;
    let to = 0;
    let index = spanIds.toReversed().findIndex((start, end) => {
      from += Buffer.byteLength(jsonStringify(start));
      to +=
        isPlainObject(start.message) && Array.isArray(start.message.content)
          ? start.message.content.length
          : 1;
      return (
        end > 0 &&
        (to > Math.floor(MAX_ROW_AGE_MS / flattened.length) || from > MAX_ROW_BYTES / flattened.length)
      );
    });
    for (let id of index < 0 ? spanIds : spanIds.slice(spanIds.length - index)) ids.add(id);
    if (index >= 0) reason = "rows_over_the_limits";
  }
  return {
    rows: [...ids],
    leftOut: reason,
  };
}
//@ chunk-qyz2x025.js:8053-8220 placement
function findLastRowBeforeSpans(spans, rowsLoaded, fromMs) {
  let index = rowsLoaded.findIndex(
    isAtOrAfterTimestamp(Math.min(...spans.map(({ since }) => Date.parse(since)))),
  );
  let uuid = (index < 0 ? rowsLoaded : rowsLoaded.slice(0, index)).findLast(fromMs)?.uuid;
  return typeof uuid === "string" ? uuid : undefined;
}
//@ chunk-qyz2x025.js:8220-8332 placement (2.1.88 match: evaluateTimeBasedTrigger, 0.795)
function isAtOrAfterTimestamp(time) {
  let time_2 = new Date(time).getTime();
  return (message) => typeof message.timestamp === "string" && Date.parse(message.timestamp) >= time_2;
}
//@ chunk-qyz2x025.js:8332-8574 placement
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
//@ chunk-qyz2x025.js:8574-8867 placement
function stripInputTransformations(event) {
  let { event: event_2 } = event;
  if (event_2.type === "message_start" && event_2.message?.input_transformations) {
    let { input_transformations: inputTransformations, ...rest } = event_2.message;
    return {
      ...event,
      event: {
        ...event_2,
        message: rest,
      },
    };
  }
  if (event_2.type === "message_delta" && event_2.input_transformations) {
    let { input_transformations: inputTransformations, ...rest } = event_2;
    return {
      ...event,
      event: rest,
    };
  }
  return event;
}
//@ chunk-qyz2x025.js:8867-9147 placement
function dropOversizeStreamEvent(frame, maxBytes) {
  let label = describeStreamEventForTelemetry(frame.event);
  let joined = Object.entries(label)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  logForDebugging(
    `CCRClient: dropping oversize ephemeral stream_event (${joined}, ${maxBytes} bytes, over the ${MAX_FRAME_BYTES}-byte limit)`,
    {
      level: "warn",
    },
  );
  logFeatureSad("ccr_partial_messages", "oversize_ephemeral_skipped", {
    ...label,
    bytes: maxBytes,
  });
}
//@ chunk-qyz2x025.js:9147-9437 placement
function describeStreamEventForTelemetry(event) {
  if (!isPlainObject(event))
    return {
      event_type: lit("other"),
    };
  let { type, delta, content_block: contentBlock } = event;
  let contentType = isPlainObject(contentBlock) ? contentBlock.type : undefined;
  return {
    event_type: fromEnum(matchedKeyOrOther(STREAM_EVENT_TYPES, type)),
    ...(type === "content_block_delta" && {
      delta_type: fromEnum(
        matchedKeyOrOther(STREAM_DELTA_TYPES, isPlainObject(delta) ? delta.type : undefined),
      ),
    }),
    ...(type === "content_block_start" && {
      content_block_type: isKnownContentBlockType(contentType) ? fromEnum(contentType) : lit("other"),
    }),
  };
}
//@ chunk-qyz2x025.js:9437-9501 placement
function matchedKeyOrOther(key, known) {
  for (let key_2 in key) if (key_2 === known) return key_2;
  return "other";
}
//@ chunk-qyz2x025.js:9501-9521 layout
var TEXT_POST_GAP_MS = 500;
var MAX_TIMER_LATENESS_MS = 60000;
//@ chunk-qyz2x025.js:9521-9760 fingerprint (2.1.88 match: accumulateStreamEvents, 0.846)
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
//@ chunk-qyz2x025.js:9760-10081 affinity
function countTextPostRhythm(timing, events, countedTextEvents, now) {
  let filtered = events.filter(
    (event) => accumulateStreamEvents(event.payload) && !countedTextEvents.has(event),
  );
  if (filtered.length === 0) return;
  for (let event of filtered) countedTextEvents.add(event);
  let textRhythm = getTextRhythm(timing);
  let { posts, gapsOver500Ms, lastPostAtMs } = textRhythm;
  textRhythm.posts++;
  if (lastPostAtMs !== undefined && now - lastPostAtMs > TEXT_POST_GAP_MS) textRhythm.gapsOver500Ms++;
  textRhythm.lastPostAtMs = now;
  return () => {
    for (let event of filtered) countedTextEvents.delete(event);
    textRhythm.posts = posts;
    textRhythm.gapsOver500Ms = gapsOver500Ms;
    textRhythm.lastPostAtMs = lastPostAtMs;
  };
}
//@ chunk-qyz2x025.js:10081-10202 affinity
function recordTimerLateness(timing, latenessMs) {
  if (!(latenessMs >= 0)) return;
  let textRhythm = getTextRhythm(timing);
  textRhythm.timerMaxLateMs = Math.max(
    textRhythm.timerMaxLateMs ?? 0,
    Math.min(Math.round(latenessMs), MAX_TIMER_LATENESS_MS),
  );
}
//@ chunk-qyz2x025.js:10202-10320 affinity
function getTextRhythm(timing) {
  timing.textRhythm ??= {
    posts: 0,
    gapsOver500Ms: 0,
    lastPostAtMs: undefined,
    timerMaxLateMs: undefined,
  };
  return timing.textRhythm;
}
//@ chunk-qyz2x025.js:10320-11010 affinity
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
  released(channel, count, released) {
    let counter = channel === "client_events" ? this.counts.clientEvents : this.counts.internalEvents;
    counter.releases += 1;
    counter.heldRows += count;
    counter.maxHeldRows = Math.max(counter.maxHeldRows, count);
    counter.maxHeldMs = Math.max(counter.maxHeldMs, released);
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
//@ chunk-qyz2x025.js:11010-15864 sole-consumer
/**
 * WorkerStateUploader：合并 worker 状态补丁（external/internal_metadata 深合并）并节流上传。
 */
class PatchQueue {
  inflight = null;
  pending = null;
  pendingWaits = false;
  pendingSince = 0;
  waitTimer = null;
  requeued = null;
  requeuedMetadata = null;
  remembered = {};
  sending = null;
  closingToNewPatches = new AbortController();
  hasDroppedSomething = false;
  cutKeptMetadata = false;
  closed = false;
  config;
  constructor(config) {
    this.config = config;
  }
  enqueue(patch) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    if (this.pending && "worker_status" in this.pending && "worker_status" in patch) this.drain();
    let waits = !("worker_status" in patch) && (this.config.waitsForStatus?.(patch) ?? false);
    this.pendingWaits = (this.pending === null || this.pendingWaits) && waits !== false;
    if (this.pendingWaits && typeof waits === "number")
      this.waitTimer ??= setTimeout(() => this.sendWaiting(), waits);
    if (this.pending === null) {
      this.pendingSince = Date.now();
      this.pending = patch;
    } else this.pending = coalescePatches(this.pending, patch);
    if ("worker_status" in patch) this.requeued = null;
    this.requeuedMetadata &&= diffMetadataAgainst(this.requeuedMetadata, patch);
    this.remember(patch);
    if (this.config.mergesSameRun?.()) queueMicrotask(() => void this.drain());
    else this.drain();
  }
  requeueStatus(requeued) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    if (this.pending && "worker_status" in this.pending) return;
    this.requeued = requeued;
    this.drain();
  }
  requeueMetadata(metadata) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    this.putBackMetadata(metadata);
  }
  putBackMetadata(metadata) {
    this.requeuedMetadata = diffMetadataAgainst(
      coalescePatches(this.requeuedMetadata ?? {}, metadata),
      this.pending ?? {},
    );
    this.drain();
  }
  remember(patch) {
    if (this.config.remembers) this.remembered = coalescePatches(this.remembered, patch);
  }
  sendWaiting(minAgeMs = 0) {
    if (this.pendingWaits && (minAgeMs <= 0 || Date.now() - this.pendingSince >= minAgeMs)) {
      this.pendingWaits = false;
      this.drain();
    }
  }
  closeToNewPatches() {
    if (this.closed) return;
    this.pendingWaits = false;
    this.disarmWaitTimer();
    this.drain();
    this.closingToNewPatches.abort();
    this.hasDroppedSomething ||= this.requeued !== null;
    this.requeued = null;
    if (this.pending) {
      this.hasDroppedSomething ||= "worker_status" in this.pending;
      this.pending = this.withoutStatus(this.pending);
    }
  }
  get isClosedToNewPatches() {
    return this.closingToNewPatches.signal.aborted;
  }
  get hasCutKeptMetadata() {
    return this.cutKeptMetadata;
  }
  get owesMetadata() {
    return (
      this.isClosedToNewPatches &&
      !this.closed &&
      (this.pending !== null ||
        this.requeuedMetadata !== null ||
        (this.sending !== null && this.withoutStatus(this.sending) !== null))
    );
  }
  keepsWithoutStatus(patch) {
    return this.withoutStatus(patch) !== null;
  }
  withoutStatus(patch) {
    if (!("worker_status" in patch)) return patch;
    let internalMetadata = patch.internal_metadata;
    let keptMetadata = isPlainObject(internalMetadata)
      ? omitAlias(
          internalMetadata,
          (this.config.ridesAStatus ?? []).filter(
            (key) => internalMetadata[key] !== null || !this.config.deleteOutlivesStatus?.includes(key),
          ),
        )
      : {};
    return Object.keys(keptMetadata).length > 0
      ? {
          internal_metadata: keptMetadata,
        }
      : null;
  }
  close() {
    this.pendingWaits = false;
    this.drain();
    this.closed = true;
    this.clearPending();
    this.requeued = null;
    this.requeuedMetadata = null;
  }
  get unsent() {
    return this.inflight !== null || this.pending !== null;
  }
  async flush() {
    while (!this.closed)
      if (this.inflight) await this.inflight;
      else if (this.pending || this.requeued || this.requeuedMetadata) {
        this.pendingWaits = false;
        await this.drain();
      } else return !this.hasDroppedSomething;
    return false;
  }
  async drain() {
    if (this.inflight || this.closed) return;
    let pending = this.pendingWaits ? null : this.pending;
    let next = pending ?? this.requeued;
    let statusOnly = !pending;
    if (pending) this.clearPending();
    else if (this.requeued) this.requeued = null;
    else if (this.requeuedMetadata) {
      let remainder = diffMetadataAgainst(this.requeuedMetadata, {
        internal_metadata: Object.fromEntries((this.config.requeuedAlone ?? []).map((key) => [key, null])),
      });
      if (remainder === null && this.pending) return;
      let [[key, value] = []] = Object.entries(remainder ?? this.requeuedMetadata);
      next =
        key === undefined
          ? null
          : {
              [key]: value,
            };
      this.requeuedMetadata = next && diffMetadataAgainst(this.requeuedMetadata, next);
    }
    if (!next) return;
    this.inflight = this.sendWithRetry(next, statusOnly).then(() => {
      this.inflight = null;
      this.sending = null;
      if ((this.pending || this.requeued || this.requeuedMetadata) && !this.closed) this.drain();
    });
  }
  async sendWithRetry(patch, statusOnly) {
    let current = patch;
    let attempts = 0;
    let cutKept = false;
    while (!this.closed) {
      this.sending = current;
      if (await this.config.send(current)) return;
      if (this.handsBackWithoutStatus(current)) return;
      if (
        this.isClosedToNewPatches &&
        statusOnly &&
        !("worker_status" in current) &&
        this.pending &&
        !this.closed
      ) {
        this.putBackMetadata(current);
        return;
      }
      if (this.isClosedToNewPatches && !cutKept) {
        cutKept = true;
        attempts = 0;
      }
      attempts++;
      await sleep(
        this.retryDelay(attempts),
        this.isClosedToNewPatches ? undefined : this.closingToNewPatches.signal,
      );
      if (this.handsBackWithoutStatus(current)) return;
      if (this.pending && !this.closed) {
        if (statusOnly) {
          if (!("worker_status" in current) && !this.pendingWaits) {
            this.putBackMetadata(current);
            return;
          }
          if ("worker_status" in current && "worker_status" in this.pending) return;
          continue;
        }
        current = coalescePatches(current, this.pending);
        this.clearPending();
      }
    }
  }
  handsBackWithoutStatus(patch) {
    if (!this.isClosedToNewPatches || !("worker_status" in patch)) return false;
    if (this.closed) return true;
    this.hasDroppedSomething = true;
    this.cutKeptMetadata ||= this.pending !== null && "external_metadata" in this.pending;
    this.pending = this.withoutStatus(this.pending ? coalescePatches(patch, this.pending) : patch);
    return true;
  }
  clearPending() {
    this.pending = null;
    this.disarmWaitTimer();
  }
  disarmWaitTimer() {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }
  retryDelay(attempt) {
    let min = Math.min(this.config.baseDelayMs * 2 ** (attempt - 1), this.config.maxDelayMs);
    let jitter = Math.random() * this.config.jitterMs;
    return min + jitter;
  }
}
//@ chunk-qyz2x025.js:15864-16033 sole-consumer
function diffMetadataAgainst(metadata, against) {
  let out = {};
  for (let [key, value] of Object.entries(metadata)) {
    let kept = pickByHelper(value, (value, fieldName) => !(fieldName in (against[key] ?? {})));
    if (Object.keys(kept).length > 0) out[key] = kept;
  }
  return Object.keys(out).length > 0 ? out : null;
}
//@ chunk-qyz2x025.js:16252-16407 placement
var EMPTY_UPLOAD_TRIM; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_HEARTBEAT_INTERVAL_MS;
var MIN_HEARTBEAT_INTERVAL_MS;
var MAX_HEARTBEAT_LEAD_MS;
var HEARTBEAT_SAFETY_MARGIN_MS;
var AUTH_REFRESH_TIMEOUT_MS;
var UNUSED_TIMEOUT_5000_MS;
var DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS;
var SHUTDOWN_REQUEST_TIMEOUT_MS;
var TOKEN_REFRESH_LEAD_MS;
var DEFAULT_PROBE_BEAT_SPACING_MS;
var HEARTBEAT_STALE_FACTOR;
var MAX_CONSECUTIVE_HEARTBEAT_FAILURES;
var HEARTBEAT_FATAL_STATUSES;
var DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS;
var DEFAULT_HELD_BUNCH_FLUSH_MS;
deferInit("chunk-qyz2x025.js:16252", () => {
  EMPTY_UPLOAD_TRIM = {};
  DEFAULT_HEARTBEAT_INTERVAL_MS = 20000;
  MIN_HEARTBEAT_INTERVAL_MS = 1e4;
  MAX_HEARTBEAT_LEAD_MS = 15000;
  HEARTBEAT_SAFETY_MARGIN_MS = 5000;
  AUTH_REFRESH_TIMEOUT_MS = HEARTBEAT_SAFETY_MARGIN_MS;
  UNUSED_TIMEOUT_5000_MS = 5000;
  DEFAULT_IDLE_HEARTBEAT_INTERVAL_MS = 300000;
  SHUTDOWN_REQUEST_TIMEOUT_MS = 2000;
  TOKEN_REFRESH_LEAD_MS = MAX_HEARTBEAT_LEAD_MS + AUTH_REFRESH_TIMEOUT_MS + 2 * DEFAULT_HEARTBEAT_INTERVAL_MS;
  DEFAULT_PROBE_BEAT_SPACING_MS = 5000;
  HEARTBEAT_STALE_FACTOR = 1.5;
  MAX_CONSECUTIVE_HEARTBEAT_FAILURES = 3;
  HEARTBEAT_FATAL_STATUSES = new Set([401, 403, 404, 429]);
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS = 100;
  DEFAULT_HELD_BUNCH_FLUSH_MS = 20;
});
//@ chunk-qyz2x025.js:16407-16455 placement
function isClientErrorStatus(status) {
  return status === 400 || status === 413 || status === 422;
}
//@ chunk-qyz2x025.js:16455-16648 placement
var EVENT_BATCH_PATH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BATCH_UNSUPPORTED_STATUSES;
var RIDE_PAUSE_BASE_MS;
var RIDE_PAUSE_MAX_MS;
var X_CCR_UPLOAD_ATTEMPT;
var MIN_EVENT_POST_TIMEOUT_MS;
var ROWS_SENT_AGAIN_WAIT_MS;
var WORKER_STATE_FLUSH_TIMEOUT_MS;
var URGENT_EVENT_POST_TIMEOUT_MS;
var ONE_MIB;
var MAX_EVENT_BATCH_BYTES;
var POST_TIMEOUT_MS_PER_MIB;
var DEFAULT_MAX_EVENT_POST_TIMEOUT_MS;
var LARGE_BATCH_RETRY_BACKOFF;
var LARGE_BATCH_BYTES;
deferInit("chunk-qyz2x025.js:16455", () => {
  EVENT_BATCH_PATH = "/worker/event-batch";
  BATCH_UNSUPPORTED_STATUSES = new Set([404, 405, 501]);
  RIDE_PAUSE_BASE_MS = 60000;
  RIDE_PAUSE_MAX_MS = 1920000;
  X_CCR_UPLOAD_ATTEMPT = "x-ccr-upload-attempt";
  MIN_EVENT_POST_TIMEOUT_MS = 1e4;
  ROWS_SENT_AGAIN_WAIT_MS = 60000;
  WORKER_STATE_FLUSH_TIMEOUT_MS = 1e4;
  URGENT_EVENT_POST_TIMEOUT_MS = 60000;
  ONE_MIB = 1048576;
  MAX_EVENT_BATCH_BYTES = 4 * ONE_MIB - 65536;
  POST_TIMEOUT_MS_PER_MIB = 5000;
  DEFAULT_MAX_EVENT_POST_TIMEOUT_MS = 120000;
  LARGE_BATCH_RETRY_BACKOFF = 1.5;
  LARGE_BATCH_BYTES = 262144;
});
//@ chunk-qyz2x025.js:16648-16824 placement
/**
 * 按批次字节数估算事件 POST 超时：基础 10s 加每 MiB 5s，大批次（≥256KiB 且不可切分）按重试次数指数放大，夹在 minMs–maxMs。
 */
function computeEventPostTimeoutMs(events, { maxMs, minMs = MIN_EVENT_POST_TIMEOUT_MS }) {
  let bytesMs =
    MIN_EVENT_POST_TIMEOUT_MS +
    Math.round((events.bytes / ONE_MIB) * (POST_TIMEOUT_MS_PER_MIB / 1000)) * 1000;
  let computedMs =
    events.bytes >= LARGE_BATCH_BYTES && !events.cuttable
      ? bytesMs * LARGE_BATCH_RETRY_BACKOFF ** events.retryCount
      : bytesMs;
  return Math.max(minMs, Math.min(maxMs, Math.round(computedMs)));
}
//@ chunk-qyz2x025.js:16824-16884 placement
var SERVABLE_CONTROL_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qyz2x025.js:16824", () => {
  SERVABLE_CONTROL_SUBTYPES = new Set(["remote_tool_call", "remote_plumbing_call"]);
});
//@ chunk-qyz2x025.js:16884-16920 placement
function isServableControlRequest(request) {
  return SERVABLE_CONTROL_SUBTYPES.has(getControlRequestSubtypeOfEvent(request));
}
//@ chunk-qyz2x025.js:16920-17245 placement
/**
 * CCR 客户端的控制请求子类型集合与相关上限常量（可服务调用的子类型、可透传的设置类子类型等）。
 */
var SERVED_CALL_REQUEST_SUBTYPES; // deferred: uses REMOTE_TOOLS_LOG_EVENTS (../../services/remoteTools/remoteToolsDebug.js) of its import cycle while loading; runs once the cycle is complete
var MAX_URGENT_REQUEST_IDS;
var SETTINGS_CONTROL_SUBTYPES;
var DEFAULT_SETTINGS_ANSWER_WAIT_MS;
var MAX_SETTINGS_REQUEST_IDS;
var HOUSEKEEPING_CONTROL_SUBTYPES;
deferInit("chunk-qyz2x025.js:16920", () => {
  SERVED_CALL_REQUEST_SUBTYPES = new Set(REMOTE_TOOLS_LOG_EVENTS);
  MAX_URGENT_REQUEST_IDS = 256;
  SETTINGS_CONTROL_SUBTYPES = new Set([
    "apply_flag_settings",
    "set_max_thinking_tokens",
    "set_permission_mode",
    "mcp_set_servers",
    "mcp_reconnect",
    "reload_skills",
  ]);
  DEFAULT_SETTINGS_ANSWER_WAIT_MS = 1000;
  MAX_SETTINGS_REQUEST_IDS = 64;
  HOUSEKEEPING_CONTROL_SUBTYPES = new Set([
    "initialize",
    "stage_file",
    "prefetch_attachments",
    "set_chrome_browser_hints",
    "mcp_toggle",
    "set_mcp_permission_mode_override",
    "set_model",
  ]);
});
//@ chunk-qyz2x025.js:17380-17530 placement
function getControlRequestSubtypeOfEvent(event) {
  let request = event.payload.type === "control_request" ? event.payload.request : undefined;
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-qyz2x025.js:17530-17655 placement (2.1.88 match: mergeClients, 1)
function mergeClients(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode) return errnoCode;
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string")
    return error.name;
  return;
}
//@ chunk-qyz2x025.js:17655-17814 fingerprint (2.1.88 match: CCRInitError, 0.72)
/**
 * CCRClient 初始化失败错误（reason + httpStatus）。
 */
class CCRInitError extends Error {
  reason;
  httpStatus;
  noAnswer;
  constructor(message, httpStatus, noAnswer = false) {
    super(`CCRClient init failed: ${message}`);
    this.reason = message;
    this.httpStatus = httpStatus;
    this.noAnswer = noAnswer;
  }
}
//@ chunk-qyz2x025.js:17814-17910 placement
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
//@ chunk-qyz2x025.js:17910-18243 placement
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
//@ chunk-qyz2x025.js:18243-18632 placement
/**
 * 流式读取响应体，超过字节上限时取消并返回 null；解码出空串但读到字节视为内存不足抛 RangeError。
 */
async function readBodyCapped(response, maxBytes) {
  let reader = response.body?.getReader();
  let textDecoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (let chunk = await reader?.read(); chunk !== undefined && !chunk.done; chunk = await reader?.read()) {
    bytes += chunk.value.byteLength;
    if (bytes > maxBytes) {
      await reader?.cancel();
      return null;
    }
    let piece = textDecoder.decode(chunk.value, {
      stream: true,
    });
    if (piece === "" && chunk.value.byteLength > 6) {
      reader?.cancel().catch(() => {});
      throw RangeError("out of memory while decoding a page");
    }
    text += piece;
  }
  return {
    text: text + textDecoder.decode(),
    bytes,
  };
}
//@ chunk-qyz2x025.js:18632-18740 placement
function isTimestampWithinLimit(timestamp, maxTimestampChars) {
  let timestamp_2 = timestamp.payload?.timestamp;
  return (
    maxTimestampChars === undefined ||
    timestamp_2 === undefined ||
    (typeof timestamp_2 === "string" && timestamp_2.length <= maxTimestampChars)
  );
}
//@ chunk-qyz2x025.js:18740-18760 placement
var INIT_STATE_ORDERING_BOUND_MS = 1e4;
var MAX_RETRY_DELAY_MS = 30000;
//@ chunk-qyz2x025.js:18760-18839 placement
function durableUploadOutcome(status) {
  return status !== undefined && status >= 400 && status < 500 ? "not_accepted" : "indeterminate";
}
//@ chunk-qyz2x025.js:18839-19045 placement
function detectTaskBookends(messages) {
  let sawTaskNotification = false;
  let sawStart = false;
  for (let message of messages)
    if (message.payload.subtype === "task_notification") sawTaskNotification = true;
    else if (message.payload.subtype === "background_tasks_changed") sawStart = true;
  return sawTaskNotification || sawStart
    ? {
        has_terminal_bookend: sawTaskNotification,
        has_level: sawStart,
      }
    : null;
}
//@ chunk-qyz2x025.js:19045-19117 placement
function clampInt32(value) {
  return Math.min(Math.max(0, Math.trunc(value) || 0), 2147483647);
}
//@ chunk-qyz2x025.js:19117-19337 placement
var ENDPOINT_CATEGORIES; // deferred: uses EVENT_BATCH_PATH of its import cycle while loading; runs once the cycle is complete
var MAX_REFUSED_INTERNAL_EVENT_UUIDS;
var UPGRADE_RELAY_MARKER;
deferInit("chunk-qyz2x025.js:19117", () => {
  ENDPOINT_CATEGORIES = {
    "/worker": "worker_state",
    [EVENT_BATCH_PATH]: "events",
    "/worker/events": "events",
    "/worker/events/delivery": "delivery",
    "/worker/heartbeat": "heartbeat",
    "/worker/internal-events": "internal_events",
  };
  MAX_REFUSED_INTERNAL_EVENT_UUIDS = 512;
  UPGRADE_RELAY_MARKER = "upgrade_relay_marker";
});
//@ chunk-qyz2x025.js:19536-20152 placement
/**
 * 云会话 worker pending_action 及事件列表的 zod schema（事件、分页、agent_metadata、批量写入结果）。
 */
var pendingActionSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sessionEventSchema;
var sessionEventsPageSchema;
var agentMetadataEventsSchema;
var eventBatchResultSchema;
deferInit("chunk-qyz2x025.js:19536", () => {
  pendingActionSchema = DoctorLazy(() =>
    objectSchema({
      tool_name: stringSchema().refine((toolName) => !toolName.startsWith("dialog:")),
      display_tool_name: stringSchema().nullish(),
      action_description: stringSchema(),
      raw_command: stringSchema().nullish(),
      request_id: stringSchema(),
      tool_use_id: stringSchema().min(1),
      suppressed_request_id: stringSchema().nullish(),
    }),
  );
  sessionEventSchema = DoctorLazy(() =>
    looseObject({
      event_id: stringSchema(),
      event_type: stringSchema(),
      payload: record(stringSchema(), unknown()),
      event_metadata: record(stringSchema(), unknown()).nullish(),
      is_compaction: booleanSchema(),
      created_at: stringSchema(),
      session_agent_id: stringSchema().optional(),
    }),
  );
  sessionEventsPageSchema = DoctorLazy(() =>
    objectSchema({
      data: array(sessionEventSchema()),
      next_cursor: stringSchema().optional(),
    }),
  );
  agentMetadataEventsSchema = DoctorLazy(() =>
    objectSchema({
      data: array(
        sessionEventSchema().extend({
          payload: looseObject({
            type: literal("agent_metadata"),
          }),
          session_agent_id: stringSchema(),
        }),
      ).optional(),
    }),
  );
  eventBatchResultSchema = DoctorLazy(() =>
    objectSchema({
      results: array(
        objectSchema({
          event_id: stringSchema(),
          duplicate: booleanSchema(),
        }),
      ),
    }),
  );
});
//@ chunk-qyz2x025.js:20152-20480 placement
/**
 * 用 schema 解析待处理动作（工具调用审批请求），取得 requestId 后返回规范化的动作对象；不合法时返回 undefined。
 */
function parsePendingAction(pendingAction) {
  let parsed = pendingActionSchema().safeParse(pendingAction);
  if (!parsed.success) return;
  let action = parsed.data;
  let requestId = requestIdOf(action);
  if (requestId === undefined) return;
  return {
    requestId,
    details: buildRequiresActionDetails({
      tool_name: action.tool_name,
      display_tool_name: action.display_tool_name ?? undefined,
      action_description: action.action_description,
      raw_command: action.raw_command ?? undefined,
      request_id: action.request_id,
      tool_use_id: action.tool_use_id,
    }),
  };
}
//@ chunk-qyz2x025.js:20480-20835 placement
/**
 * 根据 worker 外部状态里的 pending_action 判断会话是否处于 requires_action：读取中/失败/无待办/无法上报时返回 idle 与原因，否则带 requestId 与详情返回 requires_action。
 */
function resolveWorkerRequiresActionState(state) {
  if (state === "pending")
    return {
      status: "idle",
      reason: "get_pending",
    };
  if (state.readFailed)
    return {
      status: "idle",
      reason: "get_failed",
    };
  let pendingAction = state.external?.pending_action;
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
//@ chunk-qyz2x025.js:20835-21093 layout
/**
 * 通知会话状态变化（idle/running/requires_action），供 SDK/远程控制显示。
 */
function withPendingActionOutstanding(status, metadata) {
  if (status === "requires_action")
    return {
      reported: status,
    };
  let pendingActions = metadata.external?.pending_actions;
  return {
    reported: status,
    pendingActionOutstanding:
      metadata.readFailed === true ||
      (metadata.external?.pending_action !== undefined && metadata.external.pending_action !== null) ||
      (Array.isArray(pendingActions) && pendingActions.length > 0),
  };
}
//@ chunk-qyz2x025.js:21093-22942 placement
/**
 * CCR 客户端默认批量策略常量：事件数/年龄/字节上限、跨模型调用持有、事件脉冲与拾取等待、入站 UUID 容量、查看器检查点、可等待事件集合等。
 */
var WorkerLimitsSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_MAX_HOLD_EVENTS;
var DEFAULT_MAX_HOLD_EVENTS_ACROSS_CALLS;
var DEFAULT_MAX_HOLD_AGE_MS;
var DEFAULT_TRANSCRIPT_MAX_AGE_MS;
var MAX_HOLD_AGE_MS;
var EVENTS_PULSE_INTERVAL_MS;
var DEFAULT_START_REPORTS_MAX_WAIT_MS;
var VIEWER_LEFT_GRACE_MS;
var EVENTS_POST_FAILING_MAX_MS;
var DEFAULT_PICKUP_WAIT_MS;
var PICKUP_BARRIER_MAX_WRITES;
var MAX_INBOUND_MESSAGE_UUIDS;
var DEFAULT_TOOL_CALL_ROW_GRACE_MS;
var VIEWER_CHECKPOINT_INTERVAL_MS;
var DEFAULT_MAX_HOLD_BYTES;
var TOOLS_WHOSE_INPUT_MAY_WAIT;
var MAX_TOOL_INPUT_CHARS_BEFORE_FLUSH;
var MAX_TOOL_INPUT_FLUSH_MS;
var MAX_MUST_FLUSH_TYPES;
var MAX_HOLD_AGAIN_TOOL_NAMES;
var DEFAULT_SETTINGS_RECEIPTS_MAX_WAIT_MS;
var MAX_LIVE_ONLY_TYPE_REFUSALS;
deferInit("chunk-qyz2x025.js:21093", () => {
  WorkerLimitsSchema = DoctorLazy(() =>
    looseObject({
      max_events: numberSchema().nullish(),
      max_age_ms: numberSchema().nullish(),
      max_bytes: numberSchema().nullish(),
      flush_on_sampling_end: booleanSchema().nullish(),
      flush_on_assistant: booleanSchema().nullish(),
      event_batch_upload: booleanSchema().nullish().catch(undefined),
      hold_across_model_calls: booleanSchema().nullish().catch(undefined),
      hold_again: looseObject({
        soft_age_ms: numberSchema().nullish(),
        soft_events: numberSchema().nullish(),
        after: array(stringSchema()).nullish(),
        never_after_tools: array(stringSchema()).nullish(),
        tools_whose_results_wait: array(stringSchema()).nullish(),
        later_worker_holds_first_turn: booleanSchema().nullish().catch(undefined),
      })
        .nullish()
        .catch(undefined),
      may_wait_types: array(stringSchema()).nullish().catch(undefined),
      flush_after_tool_names: array(stringSchema()).nullish().catch(undefined),
      settings_receipts_max_wait_ms: numberSchema().nullish().catch(undefined),
      messages_received_waits: booleanSchema().nullish().catch(undefined),
      receipts_ride_uploads: booleanSchema().nullish().catch(undefined),
      flush_before_tools_wait_ms: numberSchema().nullish(),
      flush_after_tools: stringSchema().nullish(),
      must_flush_types: array(stringSchema()).nullish(),
      live_twin_types: array(stringSchema()).nullish().catch(undefined),
      live_only_types: array(stringSchema()).nullish().catch(undefined),
      transcript_max_age_ms: numberSchema().nullish().catch(undefined),
      no_turn_max_age_ms: numberSchema().nullish().catch(undefined),
      merge_worker_reports: booleanSchema().nullish().catch(undefined),
      control_traffic_keeps_hold: booleanSchema().nullish().catch(undefined),
      empty_checkpoint_keeps_hold: booleanSchema().nullish().catch(undefined),
      first_turn_holds_each_call: booleanSchema().nullish().catch(undefined),
      settings_answers_max_wait_ms: numberSchema().nullish().catch(undefined),
      init_max_wait_ms: numberSchema().nullish().catch(undefined),
      metadata_waits_for_status: array(stringSchema()).nullish().catch(undefined),
      metadata_never_sent: array(stringSchema()).nullish().catch(undefined),
      metadata_max_wait_ms: numberSchema().nullish().catch(undefined),
      cost_report_max_wait_ms: numberSchema().nullish().catch(undefined),
      policy_version: stringSchema().nullish(),
    }),
  );
  DEFAULT_MAX_HOLD_EVENTS = 50;
  DEFAULT_MAX_HOLD_EVENTS_ACROSS_CALLS = 90;
  DEFAULT_MAX_HOLD_AGE_MS = 120000;
  DEFAULT_TRANSCRIPT_MAX_AGE_MS = 60000;
  MAX_HOLD_AGE_MS = 240000;
  EVENTS_PULSE_INTERVAL_MS = 30000;
  DEFAULT_START_REPORTS_MAX_WAIT_MS = 2000;
  VIEWER_LEFT_GRACE_MS = 1e4;
  EVENTS_POST_FAILING_MAX_MS = 600000;
  DEFAULT_PICKUP_WAIT_MS = 5000;
  PICKUP_BARRIER_MAX_WRITES = 1000;
  MAX_INBOUND_MESSAGE_UUIDS = 256;
  DEFAULT_TOOL_CALL_ROW_GRACE_MS = 2000;
  VIEWER_CHECKPOINT_INTERVAL_MS = 5000;
  DEFAULT_MAX_HOLD_BYTES = 1048576;
  TOOLS_WHOSE_INPUT_MAY_WAIT = new Set(["Bash", "Write", "Edit", "NotebookEdit", "Agent"]);
  MAX_TOOL_INPUT_CHARS_BEFORE_FLUSH = 256;
  MAX_TOOL_INPUT_FLUSH_MS = 5000;
  MAX_MUST_FLUSH_TYPES = 32;
  MAX_HOLD_AGAIN_TOOL_NAMES = 32;
  DEFAULT_SETTINGS_RECEIPTS_MAX_WAIT_MS = MAX_HOLD_AGE_MS;
  MAX_LIVE_ONLY_TYPE_REFUSALS = 16;
});
//@ chunk-qyz2x025.js:22942-22982 placement
function isProcessedReceipt(x, status) {
  return status === "processed";
}
//@ chunk-qyz2x025.js:22982-24539 placement
/**
 * CCR 客户端的实时/元数据事件集合与刷写策略常量：live-only 与 may-wait 事件类型、可上报元数据键、响应字节上限、flush 前后工具等待、订阅者标志等。
 */
var FLAG_CONTROL_SUBTYPES; // deferred: uses WorkerLimitsSchema of its import cycle while loading; runs once the cycle is complete
var SYSTEM_FOREGROUND_SHELL_TASK_ROWS;
var SYSTEM_STATUS_REQUESTING_REPEAT;
var SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING;
var SYSTEM_STATUS_REQUESTING_REPEAT_STARTING;
var SYSTEM_STATUS_REQUESTING_FIRST;
var SYSTEM_STATUS_REQUESTING_REPEAT_WAITING;
var SYSTEM_STATUS_REQUESTING_AFTER_INPUT;
var SYSTEM_STATUS_REQUESTING_BEHIND_SUB_AGENT;
var LIVE_ONLY_EVENT_TYPES;
var MAY_WAIT_EVENT_TYPES;
var MAX_LIVE_TWIN_TYPES;
var STATUS_PAYLOAD_METADATA_KEYS;
var STATUS_METADATA_KEYS_ALL;
var DEFAULT_COST_REPORT_MAX_WAIT_MS;
var REPORTABLE_METADATA_KEYS;
var MAX_EVENT_PAYLOAD_BYTES;
var MAX_EVENT_PAYLOAD_ESTIMATED_BYTES;
var POLICY_VERSION_PATTERN;
var DEFAULT_FLUSH_BEFORE_TOOLS_WAIT_MS;
var TOOL_CALL_ROW_GRACE_FALLBACK_MS;
var FLUSH_AFTER_TOOLS_MODES;
var MAX_EPHEMERAL_RECEIPT_IDS;
var MAX_VIEWER_ROWS_BEFORE_FLUSH;
var HELD_ROWS_MAX_AGE_MS;
var DEBUG_STATE_DUMP;
var RECENT_INBOUND_EVENT_MS;
var UNWATCHED_VIEWER_LEFT_GRACE_MS;
var isEphemeralOrKeepAlive;
var isEphemeralKeepAliveOrControlResponse;
var neverFlush;
deferInit("chunk-qyz2x025.js:22982", () => {
  FLAG_CONTROL_SUBTYPES = new Set(["apply_flag_settings", "set_max_thinking_tokens", "mcp_set_servers"]);
  SYSTEM_FOREGROUND_SHELL_TASK_ROWS = "system/foreground_shell_task_rows";
  SYSTEM_STATUS_REQUESTING_REPEAT = "system/status_requesting_repeat";
  SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING = "system/status_requesting_repeat_releasing";
  SYSTEM_STATUS_REQUESTING_REPEAT_STARTING = "system/status_requesting_repeat_starting";
  SYSTEM_STATUS_REQUESTING_FIRST = "system/status_requesting_first";
  SYSTEM_STATUS_REQUESTING_REPEAT_WAITING = "system/status_requesting_repeat_waiting";
  SYSTEM_STATUS_REQUESTING_AFTER_INPUT = "system/status_requesting_repeat_after_input";
  SYSTEM_STATUS_REQUESTING_BEHIND_SUB_AGENT = "system/status_requesting_behind_sub_agent";
  LIVE_ONLY_EVENT_TYPES = new Set([
    "system/task_summary",
    SYSTEM_FOREGROUND_SHELL_TASK_ROWS,
    SYSTEM_STATUS_REQUESTING_REPEAT,
    SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING,
    SYSTEM_STATUS_REQUESTING_REPEAT_STARTING,
    SYSTEM_STATUS_REQUESTING_FIRST,
    SYSTEM_STATUS_REQUESTING_REPEAT_WAITING,
    SYSTEM_STATUS_REQUESTING_AFTER_INPUT,
    SYSTEM_STATUS_REQUESTING_BEHIND_SUB_AGENT,
  ]);
  MAY_WAIT_EVENT_TYPES = new Set([
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
  MAX_LIVE_TWIN_TYPES = 32;
  STATUS_PAYLOAD_METADATA_KEYS = new Set([
    "post_turn_summary",
    "recap",
    "context_usage",
    "rate_limit_info",
    "task_summary",
  ]);
  STATUS_METADATA_KEYS_ALL = new Set([...STATUS_PAYLOAD_METADATA_KEYS, "last_served_model"]);
  DEFAULT_COST_REPORT_MAX_WAIT_MS = MAX_HOLD_AGE_MS;
  REPORTABLE_METADATA_KEYS = new Set([
    "context_usage",
    "cross_session_inbound",
    "is_ultraplan_mode",
    "last_served_model",
    "permission_mode",
    "rate_limit_info",
  ]);
  MAX_EVENT_PAYLOAD_BYTES = MAX_LIVE_RESPONSE_BYTES;
  MAX_EVENT_PAYLOAD_ESTIMATED_BYTES = 64512;
  POLICY_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,16}$/;
  DEFAULT_FLUSH_BEFORE_TOOLS_WAIT_MS = 30000;
  TOOL_CALL_ROW_GRACE_FALLBACK_MS = 2000;
  FLUSH_AFTER_TOOLS_MODES = ["none", "write", "all"];
  MAX_EPHEMERAL_RECEIPT_IDS = 64;
  MAX_VIEWER_ROWS_BEFORE_FLUSH = 50;
  HELD_ROWS_MAX_AGE_MS = 5000;
  DEBUG_STATE_DUMP = false;
  RECENT_INBOUND_EVENT_MS = 3000;
  UNWATCHED_VIEWER_LEFT_GRACE_MS = 1e4;
  isEphemeralOrKeepAlive = (event) => event.ephemeral === true || event.payload.type === "keep_alive";
  isEphemeralKeepAliveOrControlResponse = (event) =>
    isEphemeralOrKeepAlive(event) || event.payload.type === "control_response";
  neverFlush = () => false;
});
//@ chunk-qyz2x025.js:24539-24593 placement
/**
 * 从 CLAUDE_CODE_WORKER_EPOCH 读取 worker epoch（缺失时为 NaN）。
 */
function workerEpochFromEnv() {
  return env.CLAUDE_CODE_WORKER_EPOCH ?? NaN;
}
//@ chunk-qyz2x025.js:24593-24848 placement
var CUMULATIVE_COST_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COST_STATE_METADATA_KEYS;
var DISABLED_MCP_SERVERS;
var MAX_REFUSED_ALONE_BACKOFF;
deferInit("chunk-qyz2x025.js:24593", () => {
  CUMULATIVE_COST_KEYS = [
    "cumulative_cost_usd",
    "cumulative_input_tokens",
    "cumulative_output_tokens",
    "cumulative_cache_read_tokens",
    "cumulative_cache_write_tokens",
  ];
  COST_STATE_METADATA_KEYS = new Set([
    ...CUMULATIVE_COST_KEYS,
    "cost_state",
    "memory_extract_place",
    "model_turn_stored",
  ]);
  DISABLED_MCP_SERVERS = "disabled_mcp_servers";
  MAX_REFUSED_ALONE_BACKOFF = 64;
});
//@ chunk-qyz2x025.js:24848-25007 placement
function pickCostAndModelMetadata(metadata) {
  return Object.entries(metadata).filter(
    ([key]) =>
      COST_STATE_METADATA_KEYS.has(key) ||
      key === "last_served_model" ||
      key === "worker_permission_mode" ||
      key === "plan_doc" ||
      key === "card_turn_stamp",
  );
}
//@ chunk-qyz2x025.js:25007-25067 placement
function jsonStringEncodedSize(length) {
  return 1 + (length < 128 ? 1 : length < 16384 ? 2 : length < 2097152 ? 3 : 4) + length;
}
//@ chunk-qyz2x025.js:25067-25355 placement
function estimateJsonEncodedSize(value) {
  if (typeof value === "string") return jsonStringEncodedSize(Buffer.byteLength(value));
  if (typeof value === "number") return 9;
  let size = 0;
  if (Array.isArray(value))
    for (let item of value) size += jsonStringEncodedSize(estimateJsonEncodedSize(item));
  else if (isPlainObject(value)) {
    for (let [key, value_2] of Object.entries(value))
      if (value_2 !== undefined)
        size += jsonStringEncodedSize(
          jsonStringEncodedSize(Buffer.byteLength(key)) +
            jsonStringEncodedSize(estimateJsonEncodedSize(value_2)),
        );
  } else return 2;
  return jsonStringEncodedSize(size);
}
//@ chunk-qyz2x025.js:25355-25454 placement
function isClientEventNotFoundError(response) {
  let error = response?.error;
  return error?.type === "not_found_error" && error.resource_type === "client_event";
}
//@ chunk-qyz2x025.js:25454-25512 placement
function equalsIgnoreCase(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}
//@ chunk-qyz2x025.js:25512-25728 placement
function describeUploadFailure(status) {
  if (status === 404) return "http_404_unknown_body";
  if (status === 401 || status === 403) return "http_refused";
  if (status === 429) return "http_rate_limited";
  if (status === 501) return "http_not_served";
  return status >= 500 ? "http_server_error" : "http_other";
}
//@ chunk-qyz2x025.js:25728-25916 placement
var clientEventSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qyz2x025.js:25728", () => {
  clientEventSchema = DoctorLazy(() =>
    objectSchema({
      event_id: stringSchema(),
      source: literal("client"),
      created_at: stringSchema(),
      payload: looseObject({
        uuid: stringSchema(),
      }),
      sent_by_account_id: stringSchema().nullish(),
      device_attestation_status: unknown().optional(),
      session_agent_owned: booleanSchema(),
    }),
  );
});
//@ chunk-qyz2x025.js:25916-26382 placement
function parseDeliveryEvent(event, eventId) {
  let parsed = clientEventSchema().safeParse(event);
  if (!parsed.success)
    return {
      kind: "unavailable",
      why: "malformed",
    };
  let { event_id: eventId_2, created_at: createdAt, payload } = parsed.data;
  let timestamp = Date.parse(createdAt);
  if (
    !equalsIgnoreCase(eventId_2, eventId) ||
    !Number.isFinite(timestamp) ||
    !equalsIgnoreCase(payload.uuid, eventId)
  )
    return {
      kind: "unavailable",
      why: "malformed",
    };
  return {
    kind: "event",
    event: {
      eventId,
      createdAtMs: timestamp,
      sentByAccountId: parsed.data.sent_by_account_id ?? undefined,
      deviceAttestationStatus: parsed.data.device_attestation_status,
      sessionAgentOwned: parsed.data.session_agent_owned,
      payload,
    },
  };
}
//@ chunk-qyz2x025.js:26675-141357 callgraph-witnessed (2.1.88 match: CCRClient, 0.225)
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
  withholdsWholeFiles = isSelfHostedRemoteEnvironment();
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
  lastRateLimitRepeat;
  seesModelCallBoundaries = false;
  lastRequestingList;
  liveOnlyFirstRow;
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
  loggedWholeFileWithheld = false;
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
  keepAliveAloneSentAtMs = -1 / 0;
  eventsPostsFailingSinceMs;
  eventsPostRateLimited = false;
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
  clientRowsSwitchIsOn = false;
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
  streamEventWindowRunsFromLastFlush = false;
  heldBunchFlushMs = DEFAULT_HELD_BUNCH_FLUSH_MS;
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
  leavesPoolAfterServerError;
  constructor(transport, url, options) {
    this.lastLineWhen = options?.onEpochMismatch ? "queued" : "now";
    this.onEpochMismatch =
      options?.onEpochMismatch ??
      (() => {
        process.exit(1);
      });
    this.onHeartbeatLost = options?.onHeartbeatLost;
    this.readTransport = transport;
    this.workerSocket = options?.workerSocket;
    this.nonOrigin403Transient = options?.nonOrigin403Transient ?? false;
    this.heartbeatIntervalMs = options?.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.seedHeartbeatIntervalMs = this.heartbeatIntervalMs;
    this.advertiseHeartbeatProbeSupport = options?.advertiseHeartbeatProbeSupport ?? false;
    this.uploadTrim = options?.uploadTrim ?? (() => EMPTY_UPLOAD_TRIM);
    this.keepsRequestId = () => options?.keepsRequestId?.() === true;
    this.uploadHoldMarker = () => options?.uploadHoldMarker?.() === true;
    let liveOnlyShellTaskRows = options?.liveOnlyShellTaskRows;
    this.shellTaskRowsLiveOnly = liveOnlyShellTaskRows
      ? () => liveOnlyShellTaskRows.enabled() === true
      : () =>
          this.followsServedPolicy &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_FOREGROUND_SHELL_TASK_ROWS) === true;
    this.liveOnlyShellStarts = liveOnlyShellTaskRows?.starts ?? new Map();
    this.artifactSocketIds = options?.artifactSocketIds;
    this.servedCallRequestsJumpQueue = () => options?.servedCallRequestsJumpQueue?.() === true;
    this.maxEventPostTimeoutMs = options?.maxEventPostTimeoutMs ?? DEFAULT_MAX_EVENT_POST_TIMEOUT_MS;
    this.followsServedPolicy = options?.followsServedPolicy === true;
    this.keepAliveAtWorkStart = options?.keepAliveAtWorkStart;
    this.launchFlushPolicy = options?.launchFlushPolicy;
    this.processExiting = options?.processExiting ?? (() => false);
    this.gatesToolCalls = options?.gatesToolCalls === true;
    this.toolCallRowGraceMs = options?.toolCallRowGraceMs ?? TOOL_CALL_ROW_GRACE_FALLBACK_MS;
    this.pickupWaitMs = options?.pickupWaitMs ?? DEFAULT_PICKUP_WAIT_MS;
    this.beatOnStaleReconnect = options?.beatOnStaleReconnect ?? false;
    this.idleTracker = options?.idleTracker;
    this.beatOnReactivation = (options?.beatOnReactivation ?? false) && this.idleTracker !== undefined;
    this.skipRedundantHeartbeats = options?.skipRedundantHeartbeats ?? false;
    this.probeBeatSpacingMs = options?.probeBeatSpacingMs ?? DEFAULT_PROBE_BEAT_SPACING_MS;
    this.heartbeatJitterFraction = options?.heartbeatJitterFraction ?? 0;
    this.maxAdvisedIntervalMs = this.maxAdvisedIntervalFor(this.advertiseHeartbeatProbeSupport);
    this.getAuthHeaders = options?.getAuthHeaders ?? getSessionIngressAuthHeaders;
    let isFirstPartyProvider = options?.isFirstPartyProvider;
    this.providerWithheldReason =
      isFirstPartyProvider === undefined
        ? () => "provider-unknown"
        : () => (isFirstPartyProvider() ? undefined : "data-residency");
    this.onDiagnostic = options?.onDiagnostic;
    this.onCardRecordRefused = options?.onCardRecordRefused;
    this.onRequestAuthOk = options?.onRequestAuthOk;
    this.adoptRefreshedAuth = options?.adoptRefreshedAuth;
    this.gzipRequestBodyFetch = options?.gzipRequestBodyFetch;
    this.ownConnectionPool = options?.ownConnectionPool;
    this.leavesPoolAfterServerError = options?.leavesPoolAfterServerError;
    this.reportParkAtInit = options?.reportParkAtInit ?? false;
    this.guardsClientRows = options?.guardsClientRows;
    this.flagsRefreshed();
    this.initExternalMetadata = options?.initExternalMetadata ?? {};
    this.initialWorkerStatus = options?.initialWorkerStatus ?? "idle";
    this.initStateGetOrderingBoundMs = options?.initStateGetOrderingBoundMs ?? INIT_STATE_ORDERING_BOUND_MS;
    this.stateReadEndsAtRegistration = options?.stateReadEndsAtRegistration ?? false;
    this.startReportsMaxWaitMs = options?.startReportsMaxWaitMs ?? DEFAULT_TOOL_CALL_ROW_GRACE_MS;
    this.readSource = {
      ...convertWsUrlToPostUrl(url, this.getAuthHeaders),
      isClosed: () => this.closed,
      onConflict: (reason) => this.handleEpochMismatch(reason),
      ownConnectionPool: this.ownConnectionPool,
      leavesPoolAfterServerError: this.leavesPoolAfterServerError,
    };
    this.sessionBaseUrl = this.readSource.sessionBaseUrl;
    this.sessionId = url.pathname.replace(/\/$/, "").split("/").pop() || "";
    this.workerState = new PatchQueue({
      send: async (patch) => {
        let upload =
          this.clientRowsOwed.writesNoMore && isPlainObject(patch.internal_metadata)
            ? {
                ...patch,
                internal_metadata: omitAlias(patch.internal_metadata, "client_rows_owed"),
              }
            : patch;
        let internalMetadata = isPlainObject(upload.internal_metadata) ? upload.internal_metadata : {};
        let droppedKeyPresent = DISABLED_MCP_SERVERS in internalMetadata;
        if (droppedKeyPresent) this.refusedSwitchedOffMcpServers = null;
        let result = await this.request(
          "put",
          "/worker",
          {
            worker_epoch: this.workerEpoch,
            ...upload,
          },
          "PUT worker",
        );
        if (result.ok) {
          if (upload.worker_status !== undefined) logFeatureOk("ccr_worker_state_publish");
          let refusedSwitchedOffMcpServers = this.refusedSwitchedOffMcpServers;
          if (droppedKeyPresent) this.switchedOffMcpServersRefusedAlone = 0;
          else if (
            refusedSwitchedOffMcpServers !== null &&
            refusedSwitchedOffMcpServers.writesToWaitFor > 0 &&
            Object.keys(internalMetadata).length > 0
          )
            refusedSwitchedOffMcpServers.writesToWaitFor--;
          this.requeueRefusedSwitchedOffMcpServersOnceIdle();
          return true;
        }
        if (this.closed && result.status === 409) {
          logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", {
            status: result.status,
          });
          this.droppedWorkerStatePatchCount++;
          if (this.workerState.keepsWithoutStatus(upload)) this.droppedOwedMetadataPatchCount++;
          return true;
        }
        if (isClientErrorStatus(result.status)) {
          logForDiagnosticsNoPII("warn", "cli_worker_state_4xx_dropped", {
            status: result.status,
          });
          let onlyDroppedKey =
            droppedKeyPresent &&
            Object.keys(upload).length === 1 &&
            Object.keys(internalMetadata).length === 1;
          if (!onlyDroppedKey) this.droppedWorkerStatePatchCount++;
          if (this.workerState.keepsWithoutStatus(upload)) this.droppedOwedMetadataPatchCount++;
          if (isPlainObject(upload.internal_metadata) && "client_rows_owed" in upload.internal_metadata) {
            logFeatureSad("ccr_client_rows_owed", "report_with_note_refused", {
              status: result.status,
            });
            this.clientRowsOwed.reportWithNoteRefused();
          }
          let externalMetadata = isPlainObject(upload.external_metadata) ? upload.external_metadata : {};
          if (isPlainObject(externalMetadata.pending_action))
            this.onCardRecordRefused?.(result.status, upload);
          if (droppedKeyPresent) {
            logFeatureSad("mcp_switched_off_record", "write_refused");
            this.refusedSwitchedOffMcpServers = {
              value: internalMetadata[DISABLED_MCP_SERVERS],
              writesToWaitFor: onlyDroppedKey
                ? Math.min(2 ** this.switchedOffMcpServersRefusedAlone++, MAX_REFUSED_ALONE_BACKOFF)
                : 1,
            };
          }
          this.requeueRefusedSwitchedOffMcpServersOnceIdle();
          let {
            internal_metadata: internalMetadata_2,
            external_metadata: externalMetadata_2,
            ...rest
          } = upload;
          let internalCost = pickCostAndModelMetadata(internalMetadata);
          let externalCost = pickCostAndModelMetadata(externalMetadata);
          if (
            (internalCost.length > 0 && externalCost.length > 0) ||
            (internalCost.length + externalCost.length > 0 &&
              internalCost.length + externalCost.length <
                Object.keys(rest).length +
                  Object.keys(internalMetadata).length +
                  Object.keys(externalMetadata).length)
          )
            this.workerState.requeueMetadata({
              ...(internalCost.length > 0 && {
                internal_metadata: Object.fromEntries(internalCost),
              }),
              ...(externalCost.length > 0 && {
                external_metadata: Object.fromEntries(externalCost),
              }),
            });
          if (upload.worker_status !== undefined) {
            let statusOnly = {
              worker_status: upload.worker_status,
              ...("requires_action_details" in upload && {
                requires_action_details: upload.requires_action_details,
              }),
              ...("reply_degraded" in internalMetadata && {
                internal_metadata: {
                  reply_degraded: internalMetadata.reply_degraded,
                },
              }),
            };
            if (
              Object.keys(upload).length > Object.keys(statusOnly).length ||
              Object.keys(internalMetadata).length > 1
            ) {
              this.workerState.requeueStatus(statusOnly);
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
      deleteOutlivesStatus: ["card_turn_stamp"],
      requeuedAlone: [DISABLED_MCP_SERVERS],
      mergesSameRun: () => this.flushPolicy?.mergeWorkerReports === true && this.followsServedPolicy,
      waitsForStatus: (upload) => {
        let flushPolicy = this.flushPolicy;
        let {
          external_metadata: externalMetadata = {},
          internal_metadata: internalMetadata = {},
          ...rest
        } = upload;
        if (
          !flushPolicy ||
          !this.followsServedPolicy ||
          Object.keys(rest).length > 0 ||
          !isPlainObject(externalMetadata) ||
          !isPlainObject(internalMetadata) ||
          [...Object.values(externalMetadata), ...Object.values(internalMetadata)].includes(null)
        )
          return false;
        let left = this.startReportsWaitUntilMs - performance.now();
        if (
          flushPolicy.mergeWorkerReports &&
          left > 0 &&
          this.inboundMessageUuids.size > 0 &&
          !("worker_permission_mode" in internalMetadata)
        )
          return left;
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
      send: this.settlesTakenRiders(async (events, opts) => {
        let dupes = dedupeEventsByUuid(events);
        if (dupes > 0)
          logForDebugging(
            `CCRClient: dropped ${dupes} repeated-uuid durable event(s) from one live-view POST`,
          );
        let ridingRows = opts.urgent ? undefined : this.ridingRows;
        let failedRide = this.failedRide;
        this.failedRide = undefined;
        if (
          ridingRows &&
          (this.ridesAreOff() ||
            events.every(
              (event) => isEphemeralOrKeepAlive(event) || event.payload.type === "control_response",
            ) ||
            opts.bytes + ridingRows.bytes >
              Math.min(MAX_EVENT_BATCH_BYTES, this.workerSocket?.maxBatchBytes() ?? 1 / 0))
        ) {
          this.giveBackRidingRows();
          ridingRows = undefined;
        }
        if (ridingRows) {
          this.ridingRows = undefined;
          this.takenRiders = ridingRows;
        }
        let durable = !opts.urgent && !events.every(isEphemeralKeepAliveOrControlResponse);
        if (
          durable &&
          this.receiptsMayRide() &&
          this.messagesInProcessing.size > 0 &&
          events.some((event) => event.payload.type === "result")
        ) {
          await new Promise((resolve) => {
            this.resultPostWaits = resolve;
            setImmediate(resolve);
          });
          this.resultPostWaits = undefined;
          this.messagesInProcessing.clear();
        }
        let receiptIds =
          durable && this.receiptsMayRide()
            ? [...this.waitingReceipts]
                .filter(
                  ([eventId, status]) => status === "processed" && normalizeUuidOrNull(eventId) !== null,
                )
                .slice(0, MAX_LIVE_ONLY_TYPE_REFUSALS)
                .map(([eventId]) => eventId)
            : [];
        let batch = ridingRows
          ? {
              ...opts,
              bytes: opts.bytes + ridingRows.bytes,
            }
          : opts;
        let eventPostTimeoutMs = computeEventPostTimeoutMs(batch, {
          maxMs: this.maxEventPostTimeoutMs,
          minMs: events.some(isServableControlRequest)
            ? URGENT_EVENT_POST_TIMEOUT_MS
            : opts.followsUrgent
              ? Math.min(URGENT_EVENT_POST_TIMEOUT_MS, this.maxEventPostTimeoutMs)
              : undefined,
        });
        this.reportDurableUpload(events, "sending");
        let acts = this.actsOnSubscribersReports();
        let parseBody =
          acts ||
          this.onSubscribersReported !== undefined ||
          ridingRows !== undefined ||
          receiptIds.length > 0;
        let hasSubscribersReports = this.hasSubscribersReports;
        let timings = [];
        for (let upload of this.trackedFrameUploads("ackedAtMs"))
          if (events.some((event) => event.payload.uuid === upload.uuid)) timings.push(upload.timing);
        let postedTimings = [];
        for (let timing of timings)
          if (timing.postedAtMs === undefined) {
            timing.postedAtMs = performance.now();
            timing.postedWallMs = Date.now();
            postedTimings.push(timing);
          }
        let timing = this.firstTextFrameUpload?.timing;
        let textRhythmUndo =
          timing?.postedAtMs === undefined
            ? undefined
            : countTextPostRhythm(timing, events, this.countedTextEvents, performance.now());
        let result;
        try {
          result = await this.request(
            "post",
            ridingRows ? EVENT_BATCH_PATH : "/worker/events",
            {
              ...this.uploadBody(events, opts),
              ...(ridingRows && {
                worker_events: ridingRows.rows,
              }),
              ...(receiptIds.length > 0 && {
                delivery_updates: receiptIds.map((eventId) => ({
                  event_id: eventId,
                  status: "processed",
                })),
              }),
            },
            "client events",
            {
              timeout: eventPostTimeoutMs,
              parseBody,
              uploadAttempt: opts.attempt,
            },
          );
        } catch (error) {
          ridingRows?.settle(false);
          throw error;
        } finally {
          if (receiptIds.length > 0) {
            let acks = this.takeWaitingReceipts((eventId) => receiptIds.includes(eventId));
            if (!result?.ok || result.data?.delivery_updates_applied !== true) this.queueDeliveryAcks(acks);
          }
        }
        let workerResults = result.ok ? result.data?.worker_results : undefined;
        let resultsMatch = Array.isArray(workerResults) && workerResults.length === ridingRows?.rows.length;
        ridingRows?.settle(resultsMatch);
        if (ridingRows !== undefined && result.ok) {
          this.routeOnlyFailures = 0;
          this.ridePauses = 0;
        }
        let status = result.ok ? 200 : result.status;
        let routeFailed =
          ridingRows !== undefined && result.ok && isPlainObject(result.data) && workerResults === undefined;
        if (
          (ridingRows || receiptIds.length > 0) &&
          !result.ok &&
          (isClientErrorStatus(status) ||
            (ridingRows !== undefined && BATCH_UNSUPPORTED_STATUSES.has(status)))
        ) {
          result = await this.request(
            "post",
            "/worker/events",
            this.uploadBody(events, opts),
            "client events (resent without worker_events and delivery_updates)",
            {
              timeout: eventPostTimeoutMs,
              parseBody,
              uploadAttempt: "resend",
            },
          );
          if (result.ok && status !== 413) {
            if (ridingRows !== undefined && isClientErrorStatus(status)) routeFailed = true;
            else if (ridingRows !== undefined) this.noteRouteOnlyFailure(status);
            if (receiptIds.length > 0 && isClientErrorStatus(status)) {
              this.receiptsRideRefused = true;
              logForDiagnosticsNoPII("warn", "cli_ccr_receipts_ride_turned_off", {
                status,
              });
            }
          }
        } else if (ridingRows !== undefined) {
          if (!result.ok)
            this.failedRide = {
              status,
            };
        } else if (failedRide !== undefined && result.ok) this.noteRouteOnlyFailure(failedRide.status);
        if (routeFailed) {
          this.ridesRefused = true;
          logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_turned_off", {
            status,
          });
        } else if (ridingRows && status === 200 && !resultsMatch && !this.loggedRowsLeftOut) {
          this.loggedRowsLeftOut = true;
          logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_rows_left_out");
        }
        if (result.ok) {
          for (let timing of timings)
            if (timing.ackedAtMs === undefined) timing.ackedAtMs = performance.now();
          let taskBookends = detectTaskBookends(events);
          if (taskBookends) logFeatureOk("ccr_task_status_publish", taskBookends);
          this.noteBeatingEventsPostOk(events);
          this.reportDurableUpload(events, "accepted");
          this.noteToolCallRowsSettled("client_events", "stored", events);
          this.noteClientRowsSettled("stored", events);
          if (acts && hasSubscribersReports === this.hasSubscribersReports)
            this.setHasSubscribers(result.data?.has_subscribers, "no_report");
          this.tellSubscribersReported(result.data?.has_subscribers);
          return;
        }
        this.reportDurableUpload(events, durableUploadOutcome(result.status));
        if (isClientErrorStatus(result.status)) {
          let filtered = events.filter((event) => !event.ephemeral);
          let ephemeralCount = events.length - filtered.length;
          let status = result.status;
          if (ephemeralCount > 0) {
            logForDebugging(
              `CCRClient: client event POST rejected (${result.status}) \u2014 dropping ${ephemeralCount} ephemeral event(s), retrying ${filtered.length} durable event(s)`,
              {
                level: "warn",
              },
            );
            logFeatureSad("ccr_partial_messages", "ephemeral_dropped_on_4xx", {
              status: result.status,
              count: ephemeralCount,
            });
            events.splice(0, events.length, ...filtered);
            logForDiagnosticsNoPII("warn", "cli_worker_events_4xx_ephemeral_dropped", {
              status: result.status,
              count: ephemeralCount,
            });
            if (filtered.length === 0) return;
            this.reportDurableUpload(filtered, "sending");
            let retryResult = await this.request(
              "post",
              "/worker/events",
              this.uploadBody(filtered, opts),
              "client events (durable retry)",
              {
                timeout: eventPostTimeoutMs,
                uploadAttempt: "resend",
              },
            );
            if (retryResult.ok) {
              let taskBookends = detectTaskBookends(filtered);
              if (taskBookends) logFeatureOk("ccr_task_status_publish", taskBookends);
              this.noteBeatingEventsPostOk(filtered);
              this.reportDurableUpload(filtered, "accepted");
              this.noteToolCallRowsSettled("client_events", "stored", filtered);
              this.noteClientRowsSettled("stored", filtered);
              return;
            }
            this.reportDurableUpload(filtered, durableUploadOutcome(retryResult.status));
            if (!isClientErrorStatus(retryResult.status)) {
              this.noteEventsPostFailed(retryResult.status);
              throw retryResult.fetchFailed
                ? this.retrySmaller("client_events", filtered, opts, eventPostTimeoutMs, {
                    bytes: filtered.reduce((acc, event) => acc + Buffer.byteLength(jsonStringify(event)), 0),
                  })
                : new ClientEventUploadError("client event POST failed", retryResult.retryAfterMs);
            }
            status = retryResult.status;
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
        this.rowsSentAgainStepAside(events);
        if (events.length === 0) return;
        this.noteEventsPostFailed(result.status);
        if (result.fetchFailed) throw this.retrySmaller("client_events", events, opts, eventPostTimeoutMs);
        if (status === undefined && result.reason === "no_auth_headers") {
          for (let timing of postedTimings) {
            timing.postedAtMs = undefined;
            timing.postedWallMs = undefined;
          }
          textRhythmUndo?.();
          throw new ClientEventBatchRejectedError("client event POST not sent");
        }
        throw new ClientEventUploadError("client event POST failed", result.retryAfterMs);
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
    let internalEventUploader = options?.internalEventUploader;
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
      send: async (events, opts) => {
        let dropped = this.dropOrphanedHandedOffLines(events);
        if (dropped > 0) {
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_handoff_orphans_dropped", {
            count: dropped,
          });
          logEvent("tengu_ccr_internal_events_dropped", {
            reason: lit("handoff_orphan"),
            count: dropped,
          });
          if (events.length === 0) return;
        }
        let startTime = performance.now();
        let eventPostTimeoutMs = computeEventPostTimeoutMs(opts, {
          maxMs: this.maxEventPostTimeoutMs,
          minMs: internalEventUploader?.requestTimeoutMs,
        });
        let ride = this.offerToEventsPost(events, opts);
        let result =
          ride && (await ride)
            ? {
                ok: true,
              }
            : await this.request(
                "post",
                "/worker/internal-events",
                this.uploadBody(events, opts),
                "internal events",
                {
                  timeout: eventPostTimeoutMs,
                  uploadAttempt: opts.attempt,
                },
              );
        this.markInternalEventPostWatch((watch) => watch.noteAttempt(events, startTime, result.ok));
        if (result.ok) {
          this.noteToolCallRowsSettled("internal_events", "stored", events);
          Promise.resolve()
            .then(() => this.onInternalBatchAcked?.(events))
            .catch(() => {});
          return;
        }
        if (isClientErrorStatus(result.status) && dropped === 0 && opts.mayResendInTwo()) {
          logEvent("tengu_ccr_internal_events_refused_will_split", {
            count: events.length,
            status: result.status,
          });
          throw new ClientEventResendSoonError();
        }
        if (isClientErrorStatus(result.status)) {
          this.droppedInternalEventBatches++;
          this.noteRefusedInternalEvents(events);
          this.noteToolCallRowsSettled("internal_events", "dropped", events);
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_4xx_dropped", {
            status: result.status,
            count: events.length,
            ...describeSingleRowForTelemetry(events),
          });
          logEvent("tengu_ccr_internal_events_dropped", {
            reason: lit("4xx"),
            count: events.length,
            status: result.status,
          });
          let kept = countWhere(
            events,
            (event) => isAssistantWithMessageId(event.payload) && typeof event.payload.requestId === "string",
          );
          if (this.loggedRequestIdKept && kept > 0)
            logFeatureBad("ccr_worker_error_request_id_kept", `upload_refused_${result.status}`, {
              count: kept,
              status: result.status,
            });
          return;
        }
        if (result.fetchFailed) throw this.retrySmaller("internal_events", events, opts, eventPostTimeoutMs);
        if (result.reason === "no_auth_headers")
          throw new ClientEventBatchRejectedError("internal event POST not sent");
        throw new ClientEventUploadError(
          "internal event POST failed",
          result.nonOriginRefusal ? MAX_RETRY_DELAY_MS : result.retryAfterMs,
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
            updates: batch.map((update) => ({
              event_id: update.eventId,
              status: update.status,
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
    this.setStreamEventFlushIntervalMs(options?.streamEventFlushIntervalMs);
    this.setStreamEventFirstFlushMs(options?.streamEventFirstFlushMs);
    this.setStreamEventWindowRunsFromLastFlush(options?.streamEventWindowRunsFromLastFlush);
    this.setHeldBunchFlushMs(options?.heldBunchFlushMs);
    this.setToolInputFlushMs(options?.toolInputFlushMs);
    this.setNoSubscriberStreamEventFlushIntervalMs(options?.noSubscriberStreamEventFlushIntervalMs);
    this.setNoSubscriberUploadHoldMs(options?.noSubscriberUploadHoldMs);
    this.setDropUnwatchedStreamEvents(options?.dropUnwatchedStreamEvents);
    transport.setOnEvent((event) => {
      if (this.processExiting() && isUserPayload(event)) return;
      this.noteSettingsRequest(event.payload);
      let subtype =
        isPlainObject(event.payload) &&
        event.payload.type === "control_request" &&
        isPlainObject(event.payload.request)
          ? event.payload.request.subtype
          : undefined;
      if (HOUSEKEEPING_CONTROL_SUBTYPES.has(subtype)) {
        for (let id of [event.event_id, event.payload.uuid])
          if (typeof id === "string") {
            this.housekeepingRequestIds.add(id);
            evictOldestIfFull(this.housekeepingRequestIds);
          }
      }
      this.reportDelivery(
        event.event_id,
        "received",
        isPlainObject(event.payload) &&
          event.payload.type === "user" &&
          typeof event.payload.uuid === "string"
          ? event.payload.uuid
          : undefined,
        {
          controlTraffic: isRelayableControlFrame(event.payload),
          settingsRequest: FLAG_CONTROL_SUBTYPES.has(subtype),
        },
      );
    });
    transport.setOnHeartbeatProbe(() => {
      this.setHasSubscribers(undefined, "reset");
      this.heartbeatNow("probe");
    });
    transport.setOnCheckpointRequest(() => this.checkpointForViewer("watcher"));
    transport.setOnReconnected(() => {
      this.resyncAfterReconnect();
      options?.onStreamReconnected?.();
      if (this.holdsAcrossModelCalls()) this.checkpointForViewer("reconnect");
    });
    this.unsubscribeIdleTracker = this.beatOnReactivation
      ? this.idleTracker?.onActivity(() => this.sendReactivationBeat())
      : undefined;
  }
  maxAdvisedIntervalFor(probeSupported) {
    return probeSupported
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
    let beatOn = beatOnReactivation && this.idleTracker !== undefined;
    if (beatOn !== this.beatOnReactivation) {
      this.beatOnReactivation = beatOn;
      this.unsubscribeIdleTracker?.();
      this.unsubscribeIdleTracker =
        beatOn && !this.closed ? this.idleTracker?.onActivity(() => this.sendReactivationBeat()) : undefined;
    }
  }
  async initialize(epoch) {
    let now = Date.now();
    if (Object.keys(this.getAuthHeaders()).length === 0) throw new CCRInitError("no_auth_headers");
    if (epoch === undefined) epoch = workerEpochFromEnv();
    if (isNaN(epoch)) throw new CCRInitError("missing_epoch");
    this.workerEpoch = epoch;
    if (!this.flushPolicy) this.takeUpFlushPolicy(undefined);
    let abortController = new AbortController();
    let readDone = false;
    let abortController_2 = new AbortController();
    let workerState = this.getWorkerState(
      "worker_state",
      false,
      AbortSignal.any([this.closeAbort.signal, abortController.signal]),
    );
    let winner = await Promise.race([
      workerState.then(
        (winner) => {
          readDone = true;
          return winner.metadata;
        },
        () => {
          readDone = true;
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
    let park = this.reportParkAtInit ? resolveWorkerRequiresActionState(winner) : undefined;
    let metadataNeverSent = this.followsServedPolicy ? this.flushPolicy?.metadataNeverSent : undefined;
    let externalMetadata = {
      ...this.initExternalMetadata,
      ...Object.fromEntries(Array.from(metadataNeverSent ?? [], (key) => [key, null])),
    };
    let idleBody = {
      worker_status: "idle",
      worker_epoch: this.workerEpoch,
      external_metadata: {
        ...externalMetadata,
        task_summary: null,
      },
    };
    let registration =
      park === undefined
        ? {
            worker_status: this.initialWorkerStatus,
            worker_epoch: this.workerEpoch,
            external_metadata: {
              ...externalMetadata,
              pending_action: null,
              pending_actions: null,
              task_summary: null,
            },
          }
        : park.status === "requires_action"
          ? {
              ...idleBody,
              worker_status: "requires_action",
              requires_action_details: park.details,
            }
          : idleBody;
    let result = {
      ok: false,
    };
    let reasons = new Set();
    let attempts = 10;
    let attempt = 0;
    for (let j = 1; j <= attempts; j++) {
      if (this.closed) break;
      attempt = j;
      result = await this.request("put", "/worker", registration, "PUT worker (init)");
      if (result.ok || this.closed) break;
      if (result.reason) reasons.add(result.reason);
      this.onDiagnostic?.(
        `PUT /worker failed (${result.reason ?? "unknown"}) attempt=${j}/${attempts}, ${Math.round((Date.now() - now) / 1000)}s elapsed`,
        "warn",
        "worker_registration_attempt_failed",
      );
      if (isClientErrorStatus(result.status)) {
        if (park?.status === "requires_action") {
          park = {
            status: "idle",
            reason: "park_rejected",
          };
          registration = idleBody;
          j--;
          continue;
        }
        break;
      }
      if (j < attempts) {
        let delay = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
        await sleep(delay);
      }
    }
    if (!result.ok) {
      if (!this.closed) {
        logForDiagnosticsNoPII("error", "cli_worker_init_put_retries_exhausted");
        this.onDiagnostic?.(
          `PUT /worker retries exhausted: ${attempt} attempts over ${Math.round((Date.now() - now) / 1000)}s, errors=[${[...reasons].join(",") || "unknown"}]`,
          "warn",
          "worker_registration_gave_up",
        );
      }
      throw new CCRInitError("worker_register_failed", result.status, result.fetchFailed === true);
    }
    this.currentState = park?.status ?? this.initialWorkerStatus;
    this.startReportsWaitUntilMs =
      this.currentState === "idle" ? performance.now() + this.startReportsMaxWaitMs : 0;
    let { worker_epoch: workerEpoch, ...body } = registration;
    this.workerState.remember(body);
    this.applyUploadHold("idle");
    this.parkReportedAtInitRequestId = park?.status === "requires_action" ? park.requestId : undefined;
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
      if (this.gatesToolCalls)
        this.stopToolCallGate = setBridgeSessionListener((call) => this.gateToolCall(call));
    }
    logForDebugging(`CCRClient: initialized, epoch=${this.workerEpoch}`);
    logForDiagnosticsNoPII("info", "cli_worker_lifecycle_initialized", {
      epoch: this.workerEpoch,
      duration_ms: Date.now() - now,
      reported_status: this.currentState,
    });
    recordPhase("worker_init_ms", Date.now() - now, now - performance.timeOrigin);
    if (park)
      logEvent("tengu_ccr_init_park_report", {
        reported: fromEnum(park.status),
        reason: fromEnum(park.reason),
      });
    let abandoned = this.stateReadEndsAtRegistration && !readDone;
    if (abandoned) abortController.abort();
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
        ...externalMetadata,
      };
    if (!this.closed)
      logForDiagnosticsNoPII("info", "cli_worker_state_restored", {
        duration_ms: durationMs,
        had_state: metadata.external !== null || metadata.internal !== null,
        read_failed: metadata.readFailed === true,
        read_abandoned_at_registration: abandoned && metadata.readFailed === true,
      });
    return park
      ? {
          ...metadata,
          initParkReport: withPendingActionOutstanding(park.status, metadata),
        }
      : metadata;
  }
  async getWorkerState(context = "worker_state", force = false, signal = this.closeAbort.signal) {
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
    let response = await CCRClient.getWithRetry(
      this.readSource,
      `${this.sessionBaseUrl}/worker${hearthQuerySuffix(force)}`,
      authHeaders,
      context,
      undefined,
      undefined,
      {
        signal,
      },
    );
    return {
      metadata: {
        external: response?.worker?.external_metadata ?? null,
        internal: response?.worker?.internal_metadata ?? null,
        ...(response === null && {
          readFailed: true,
        }),
      },
      projectsAssertion: isHearthRequest(response),
      durationMs: Date.now() - startMs,
    };
  }
  get currentWorkerEpoch() {
    return this.workerEpoch;
  }
  readOwnClientEvent(row) {
    return CCRClient.readOwnClientEventFrom(this.readSource, row);
  }
  static async readOwnClientEventFrom(source, eventId) {
    let url = `${source.sessionBaseUrl}/worker/events/${encodeURIComponent(eventId.toLowerCase())}`;
    let failure = {
      kind: "unavailable",
      why: "network",
    };
    for (let j = 1; j <= WORKER_STATE_MAX_ATTEMPTS; j++) {
      let headers;
      try {
        headers = source.getAuthHeaders();
      } catch {
        return {
          kind: "unavailable",
          why: "no_auth_headers",
        };
      }
      if (Object.keys(headers).length === 0)
        return {
          kind: "unavailable",
          why: "no_auth_headers",
        };
      let response;
      try {
        response = await proxyAwareFetch(
          url,
          {
            headers: {
              ...headers,
              "anthropic-version": "2023-06-01",
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
            },
            signal: AbortSignal.timeout(1e4),
            ...getProxyFetchOptions({
              url,
            }),
          },
          source.ownConnectionPool,
          source.leavesPoolAfterServerError,
        );
      } catch {
        failure = {
          kind: "unavailable",
          why: "network",
        };
      }
      if (response !== undefined) {
        let body = await response.json().catch(() => {
          return;
        });
        if (response.ok) return parseDeliveryEvent(body, eventId);
        if (response.status === 404 && isClientEventNotFoundError(body))
          return {
            kind: "absent",
          };
        failure = {
          kind: "unavailable",
          why: describeUploadFailure(response.status),
        };
        if (response.status < 500 || response.status === 501) return failure;
      }
      if (j < WORKER_STATE_MAX_ATTEMPTS)
        await sleep(Math.min(500 * 2 ** (j - 1), 4000) + Math.random() * 500);
    }
    return failure;
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
  static async readProjectsBindingFor(url, getAuthHeaders) {
    let source = convertWsUrlToPostUrl(url, getAuthHeaders);
    if (Object.keys(getAuthHeaders()).length === 0)
      return {
        read: false,
      };
    let response = await CCRClient.getWithRetry(
      source,
      `${source.sessionBaseUrl}/worker${hearthQuerySuffix(true)}`,
      getAuthHeaders(),
      "projects_binding",
    );
    return response === null
      ? {
          read: false,
        }
      : {
          read: true,
          assertion: isHearthRequest(response),
        };
  }
  request(method, path, body, context, opts = {}) {
    return this.sendRequest(method, path, body, context, opts);
  }
  async sendRequest(
    method,
    path,
    body,
    context,
    {
      timeout = MIN_EVENT_POST_TIMEOUT_MS,
      parseBody = false,
      countTowardEscalation = true,
      signal,
      onLateSocketAnswer,
      uploadAttempt,
      outsideItsLane = false,
    },
  ) {
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0)
      return {
        ok: false,
        reason: "no_auth_headers",
      };
    let url = `${this.sessionBaseUrl}${path}`;
    let timeoutSignal = signal
      ? createCombinedAbortSignal(signal, {
          timeoutMs: timeout,
          refTimer: true,
        })
      : undefined;
    let posted = false;
    let Authorization = authHeaders.Authorization;
    try {
      let encoded = jsonStringify(body);
      let startTime = performance.now();
      let carry = signal
        ? undefined
        : path === "/worker/heartbeat"
          ? this.workerSocket?.beat(encoded, timeout, (reply) => onLateSocketAnswer?.(reply))
          : this.workerSocket?.carry(path, encoded, timeout);
      let carried = carry && (await carry);
      let response = carried;
      if (!response) {
        if (carry && path === "/worker/heartbeat" && this.closed)
          return {
            ok: false,
            reason: "closed",
          };
        let init = {
          method: method.toUpperCase(),
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
          body: encoded,
          signal: timeoutSignal?.signal ?? AbortSignal.timeout(timeout),
          ...getProxyFetchOptions({
            url,
          }),
        };
        if (carry) {
          let headers = {};
          try {
            headers = this.getAuthHeaders();
          } catch (error) {
            logForDebugging(
              `CCRClient: could not read credentials again for a request the worker socket handed to POST: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          }
          if (Object.keys(headers).length > 0) {
            let headers_2 = init.headers;
            for (let key of Object.keys(authHeaders)) delete headers_2[key];
            Object.assign(headers_2, headers);
            Authorization = headers.Authorization;
          }
          init.signal = AbortSignal.timeout(
            path === "/worker/heartbeat" ? Math.max(0, timeout - (performance.now() - startTime)) : timeout,
          );
        }
        Object.assign(init.headers, this.tickets.headersFor(Authorization));
        response = this.gzipRequestBodyFetch
          ? await this.gzipRequestBodyFetch(url, init, (init) =>
              proxyAwareFetch(url, init, this.ownConnectionPool, this.leavesPoolAfterServerError),
            )
          : await proxyAwareFetch(url, init, this.ownConnectionPool, this.leavesPoolAfterServerError);
      }
      posted = true;
      if (!carried) this.tickets.note(Authorization, response);
      if (response.ok) {
        this.consecutiveAuthFailures = 0;
        this.consecutiveNotFound = 0;
        let originRun = ENDPOINT_CATEGORIES[path];
        if (!outsideItsLane) {
          this.reportNonOriginRun("onCleared", originRun);
          this.nonOriginRuns.delete(originRun);
        }
        for (let [othersPassed, run] of this.nonOriginRuns)
          if (othersPassed !== originRun) run.othersPassed = true;
        if (parseBody)
          try {
            return {
              ok: true,
              data: await response.json(),
            };
          } catch {
            return {
              ok: true,
            };
          }
        await drainResponseBody(response);
        return {
          ok: true,
        };
      }
      let conflictReason;
      if (response.status === 409 && !this.closed) conflictReason = await readConflictReason(response);
      else await drainResponseBody(response);
      if (this.closed)
        return {
          ok: false,
          status: response.status,
          reason: `http_${response.status}`,
        };
      if (response.status === 409) this.handleEpochMismatch(conflictReason);
      if (response.status === 404 && countTowardEscalation && path !== EVENT_BATCH_PATH) {
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
            `${this.consecutiveNotFound} consecutive 404s on ${path} \u2014 session gone, exiting`,
            "warn",
            "session_not_found",
          );
          this.escalateEpochMismatch("session_not_found");
        }
      }
      let source =
        response.status !== 403
          ? undefined
          : carried
            ? "origin"
            : readRequestIdSource((header) => response.headers.get(header));
      let nonOrigin403Transient = this.nonOrigin403Transient;
      let counts = nonOrigin403Transient !== false && isNonOriginSource(source);
      if (counts && typeof nonOrigin403Transient === "object" && !outsideItsLane) {
        let category = ENDPOINT_CATEGORIES[path];
        let startTime = performance.now();
        let run = this.nonOriginRuns.get(category) ?? {
          sinceMs: startTime,
          refusals: 0,
          windowsSpent: 0,
          othersPassed: false,
        };
        this.nonOriginRuns.set(category, run);
        run.refusals++;
        counts = startTime - run.sinceMs < nonOrigin403Transient.windowMs;
        if (counts)
          try {
            nonOrigin403Transient.onRefused(category);
          } catch (error) {
            logForDebugging(`CCRClient: onRefused threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        else if (startTime - run.sinceMs >= (run.windowsSpent + 1) * nonOrigin403Transient.windowMs) {
          run.windowsSpent++;
          this.reportNonOriginRun("onWindowSpent", category);
        }
      }
      if (response.status === 401 || response.status === 403) {
        let sessionIngressAuthToken = getSessionIngressAuthToken();
        let expiry = sessionIngressAuthToken ? decodeJwtExpiry(sessionIngressAuthToken) : null;
        if (expiry !== null && expiry * 1000 < Date.now()) {
          logForDebugging(
            `CCRClient: session_token expired (exp=${new Date(expiry * 1000).toISOString()}) \u2014 no refresh was delivered, exiting`,
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
            `session_token expired (exp=${new Date(expiry * 1000).toISOString()}) \u2014 no refresh delivered, exiting`,
            "warn",
            "token_expired",
          );
          this.escalateEpochMismatch("token_expired");
        }
        if (countTowardEscalation && !counts) {
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
              `${this.consecutiveAuthFailures} consecutive auth failures (HTTP ${response.status}) with valid-looking token \u2014 exiting`,
              "warn",
              "auth_exhausted",
            );
            this.escalateEpochMismatch("auth_exhausted");
          }
        }
      }
      logForDebugging(`CCRClient: ${context} returned ${response.status}`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_worker_request_failed", {
        method,
        path,
        status: response.status,
        ...(source !== undefined && {
          source,
        }),
      });
      if (response.status === 429) {
        let retryAfter = response.headers.get("retry-after");
        let retryAfterMs = retryAfter ? parseInt(retryAfter, 10) : NaN;
        if (!isNaN(retryAfterMs) && retryAfterMs >= 0)
          return {
            ok: false,
            retryAfterMs: retryAfterMs * 1000,
            status: response.status,
            reason: `http_${response.status}`,
          };
      }
      return {
        ok: false,
        status: response.status,
        reason: `http_${response.status}`,
        ...(counts && {
          nonOriginRefusal: counts,
        }),
      };
    } catch (error) {
      logForDebugging(`CCRClient: ${context} failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_worker_request_error", {
        method,
        path,
        error_code: mergeClients(error),
      });
      let reason = `fetch_failed:${mergeClients(error)}`;
      return posted
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
      timeoutSignal?.cleanup();
    }
  }
  reportNonOriginRun(event, category) {
    let run = this.nonOriginRuns.get(category);
    if (run === undefined || typeof this.nonOrigin403Transient !== "object") return;
    let rounded = Math.round(performance.now() - run.sinceMs);
    let { unsentClientEvents, unsentInternalEvents } = this.uploadBacklog();
    logForDebugging(
      `CCRClient: ${category} ${event === "onCleared" ? "accepted again" : "still refused"} after ${rounded}ms of non-origin 403s (${run.refusals} refusals)`,
      {
        level: "warn",
      },
    );
    try {
      this.nonOrigin403Transient[event]({
        lane: category,
        refusals: run.refusals,
        runMs: rounded,
        windowsSpent: run.windowsSpent,
        othersPassed: run.othersPassed,
        backlog: unsentClientEvents + unsentInternalEvents,
      });
    } catch (error) {
      logForDebugging(`CCRClient: ${event} threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  reportState(state, details) {
    if (state === this.currentState && !details) return;
    let parkReportedAtInitRequestId = this.parkReportedAtInitRequestId;
    this.parkReportedAtInitRequestId = undefined;
    if (
      parkReportedAtInitRequestId !== undefined &&
      state === "requires_action" &&
      this.currentState === "requires_action" &&
      requestIdOf(details) === parkReportedAtInitRequestId
    )
      return;
    if (state === "idle") {
      this.openPickupBarriers(this.pickupBarriers.length);
      this.openTurn();
    }
    this.currentState = state;
    this.startReportsWaitUntilMs = 0;
    this.workerState.enqueue({
      worker_status: state,
      requires_action_details: details ? buildRequiresActionDetails(details) : null,
      internal_metadata: {
        reply_degraded: isHearthDegraded(),
        ...(this.guardsClientRows !== undefined &&
          this.clientRowsOwed.stateReported(
            state,
            new Date(),
            this.flagsRefreshed() && this.clientRowsAreGuarded(),
          )),
      },
      ...(this.autocompactStateStored !== undefined && {
        external_metadata: {
          autocompact_state: this.autocompactStateStored,
        },
      }),
    });
    this.autocompactStateStored = undefined;
    this.applyUploadHold(state === "running" ? "idle" : state);
  }
  reportMetadata(metadata) {
    let metadataNeverSent = this.flushPolicy?.metadataNeverSent;
    let filtered = this.withoutRepeatsOfRecord(
      metadataNeverSent?.size && this.followsServedPolicy
        ? pickByHelper(metadata, (value, key) => value === null || !metadataNeverSent.has(key))
        : metadata,
    );
    if (filtered !== metadata && Object.keys(filtered).length === 0) return;
    this.workerState.enqueue({
      external_metadata: blockedToNeedInput(filtered),
    });
  }
  withoutRepeatsOfRecord(metadata) {
    let filtered = Object.keys(metadata).filter((key) => {
      if (!REPORTABLE_METADATA_KEYS.has(key) || this.reportedKeys.has(key)) return false;
      this.reportedKeys.add(key);
      return (
        this.recordAtStart !== undefined &&
        import_sortedIndex_2(metadata[key] ?? undefined, this.recordAtStart[key] ?? undefined)
      );
    });
    return filtered.length > 0 ? pickByHelper(metadata, (value, key) => !filtered.includes(key)) : metadata;
  }
  reportInternalMetadata(internalMetadata) {
    this.workerState.enqueue({
      internal_metadata: internalMetadata,
    });
  }
  handleEpochMismatch(reason) {
    let code = reason ?? "epoch_conflict";
    let cause = reason ?? "unattributed";
    logForDebugging(`CCRClient: Epoch mismatch (409, reason=${cause}), shutting down`, {
      level: "error",
    });
    logForDiagnosticsNoPII(
      "error",
      code === "epoch_stale"
        ? "cli_worker_epoch_stale"
        : code === "session_not_active"
          ? "cli_worker_session_not_active"
          : "cli_worker_epoch_mismatch",
      {
        reason: cause,
      },
      this.lastLineWhen,
    );
    let detail =
      code === "epoch_stale"
        ? "stale registration (no live successor)"
        : code === "session_not_active"
          ? "session archived or no longer active"
          : code === "superseded_by_worker"
            ? "superseded by a newer worker"
            : "unattributed conflict, treated as superseded";
    this.onDiagnostic?.(
      `worker epoch mismatch (409) reason=${cause} epoch=${this.workerEpoch} \u2014 ${detail}, exiting`,
      "warn",
      code,
    );
    this.escalateEpochMismatch(code);
  }
  escalateEpochMismatch(code) {
    this.lastEpochMismatchCause = code;
    this.epochMismatchCount++;
    this.epochSuperseded = true;
    return this.onEpochMismatch(code);
  }
  startHeartbeat() {
    this.stopHeartbeat();
    if (this.closed) return;
    let schedule = () => {
      let jitter =
        Math.max(
          this.heartbeatIntervalMs * this.heartbeatJitterFraction,
          this.keepAlivesGoAlone() ? DEFAULT_START_REPORTS_MAX_WAIT_MS : 0,
        ) *
        (2 * Math.random() - 1);
      this.heartbeatTimer = setTimeout(tick, Math.min(MAX_TIMER_DELAY_MS, this.heartbeatIntervalMs + jitter));
    };
    let tick = () => {
      let lastCadenceTickAtMs = this.lastCadenceTickAtMs;
      this.lastCadenceTickAtMs = Date.now();
      if (this.canSkipCadenceBeat(lastCadenceTickAtMs)) {
        this.skippedPreviousCadenceBeat = true;
        this.idleTracker?.sampleIdleSeconds();
        logForDebugging("CCRClient: Heartbeat skipped (events beat)");
      } else this.sendHeartbeat();
      if (this.heartbeatTimer === null) return;
      if (
        env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
        hasActiveWork() &&
        (this.keepAlivesGoAlone() ||
          (this.holdsAcrossModelCalls() &&
            this.turnHold === "whole" &&
            this.lastCadenceTickAtMs - this.lastEventsAnswerOrPulseAtMs >= EVENTS_PULSE_INTERVAL_MS))
      ) {
        this.lastEventsAnswerOrPulseAtMs = this.lastCadenceTickAtMs;
        this.writeEvent({
          type: "keep_alive",
        });
      }
      schedule();
    };
    this.lastCadenceTickAtMs = Date.now();
    schedule();
  }
  noteBeatingEventsPostOk(events) {
    this.lastEventsAnswerOrPulseAtMs = Date.now();
    this.eventsPostsFailingSinceMs = undefined;
    this.eventsPostRateLimited = false;
    if (!this.workerSocket?.isTransport() && events.some((event) => !event.ephemeral))
      this.lastBeatingEventsPostOkAtMs = Date.now();
  }
  canSkipCadenceBeat(now) {
    let interval = this.heartbeatIntervalMs * (1 + this.heartbeatJitterFraction);
    if (
      !this.skipRedundantHeartbeats ||
      this.closed ||
      this.lastBeatingEventsPostOkAtMs < now ||
      this.lastBeatingEventsPostOkAtMs > this.lastCadenceTickAtMs ||
      this.lastCadenceTickAtMs - this.lastBeatingEventsPostOkAtMs > interval * HEARTBEAT_STALE_FACTOR ||
      this.heartbeatIntervalMs > this.seedHeartbeatIntervalMs ||
      this.isIdleAdvised() ||
      this.consecutiveHeartbeatFailures > 0 ||
      this.skippedPreviousCadenceBeat
    )
      return false;
    let span = interval * 2;
    return this.clampToTokenLifetime(span) >= span;
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
      let result = await this.request(
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
      if (result.ok) logFeatureOk("ccr_worker_lease_release");
      else if (result.status !== 409)
        logFeatureSad(
          "ccr_worker_lease_release",
          result.status !== undefined ? `http_${result.status}` : "send_failed",
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
    if (isRemoteManagedEnvironment() && isActivityReasonActive("resume_load")) {
      logForDiagnosticsNoPII("info", "cli_worker_goodbye_skipped_resume_load");
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
      .then((result) => {
        if (result.ok) logFeatureOk("ccr_worker_goodbye");
        else if (result.status !== 409)
          logFeatureSad(
            "ccr_worker_goodbye",
            result.status !== undefined ? `http_${result.status}` : "send_failed",
          );
      })
      .catch(() => {
        logFeatureSad("ccr_worker_goodbye", "send_threw");
      });
  }
  heartbeatNow(trigger = "probe") {
    if (this.closed) return;
    if (
      trigger === "probe"
        ? this.pendingBeatTrigger === "reactivate"
        : trigger === "reactivate" && this.pendingBeatTrigger === "probe"
    )
      this.restoreReactivationArm();
    if (
      trigger === "probe" ||
      this.pendingBeatTrigger === null ||
      (trigger === "reactivate" && this.pendingBeatTrigger !== "probe")
    )
      this.pendingBeatTrigger = trigger;
    if (this.heartbeatInFlight) {
      this.pendingForcedBeat = true;
      return;
    }
    let since = Date.now() - this.lastHeartbeatSentAtMs;
    if (since < this.probeBeatSpacingMs) {
      if (this.probeBeatTimer) return;
      this.probeBeatTimer = setTimeout(() => {
        this.probeBeatTimer = null;
        this.refireForcedBeat();
      }, this.probeBeatSpacingMs - since);
      return;
    }
    let pendingBeatTrigger = this.pendingBeatTrigger ?? trigger;
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
  armReactivationIfEarned(seconds, intervalSec) {
    if (this.beatOnReactivation && seconds !== undefined && seconds >= intervalSec)
      this.reactivationBeatArmed = true;
  }
  sendReactivationBeat() {
    if (!this.reactivationBeatWanted()) return;
    this.reactivationBeatArmed = false;
    this.heartbeatNow("reactivate");
  }
  isIdleAdvised() {
    return this.advertiseHeartbeatProbeSupport && this.idleGrantLatched;
  }
  applyShorterIntervalNow(intervalMs) {
    if (intervalMs >= this.heartbeatIntervalMs) return;
    this.heartbeatIntervalMs = intervalMs;
    if (this.heartbeatTimer !== null) this.startHeartbeat();
  }
  clampToTokenLifetime(intervalMs) {
    if (!this.advertiseHeartbeatProbeSupport || !this.adoptRefreshedAuth) return intervalMs;
    let sessionIngressAuthToken = getSessionIngressAuthToken();
    let expiry = sessionIngressAuthToken ? decodeJwtExpiry(sessionIngressAuthToken) : null;
    if (expiry === null) return intervalMs;
    let left = expiry * 1000 - Date.now() - TOKEN_REFRESH_LEAD_MS;
    if (left >= intervalMs) return intervalMs;
    return Math.max(MIN_HEARTBEAT_INTERVAL_MS, left);
  }
  reclampCurrentIntervalToTokenLifetime() {
    let intervalMs = this.clampToTokenLifetime(this.heartbeatIntervalMs);
    if (intervalMs < this.heartbeatIntervalMs) {
      logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
        from_ms: this.heartbeatIntervalMs,
        to_ms: intervalMs,
      });
      this.applyShorterIntervalNow(intervalMs);
    }
  }
  renewStream() {
    let renew = () => this.readTransport.renewConnection();
    if (this.workerSocket) this.workerSocket.whenQuiet(renew);
    else renew();
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
  async sendHeartbeat(trigger) {
    if (this.closed) {
      this.stopHeartbeat();
      return;
    }
    this.workerState.sendWaiting(this.followsServedPolicy ? this.flushPolicy?.metadataMaxWaitMs : 0);
    if (this.heartbeatInFlight) return;
    this.heartbeatInFlight = true;
    this.lastHeartbeatSentAtMs = Date.now();
    let lastHeartbeatSentAtMs = this.lastHeartbeatSentAtMs;
    let beat = ++this.heartbeatsSent;
    let state = {
      succeededLateOnSocket: false,
    };
    this.skippedPreviousCadenceBeat = false;
    if (trigger === "resync_stale")
      logForDiagnosticsNoPII("info", "cli_heartbeat_reconnect_stale_beat", {
        gap_ms: this.lastHeartbeatSentAtMs - this.lastHeartbeatSuccessAtMs,
        interval_ms: this.heartbeatIntervalMs,
      });
    try {
      if (trigger === "reactivate")
        logForDiagnosticsNoPII("info", "cli_heartbeat_reactivation_beat", {
          interval_ms: this.heartbeatIntervalMs,
        });
      let idleSeconds = this.idleTracker?.sampleIdleSeconds();
      let idleArg = this.advertiseHeartbeatProbeSupport ? idleSeconds : undefined;
      let result = await this.request(
        "post",
        "/worker/heartbeat",
        {
          session_id: this.sessionId,
          worker_epoch: this.workerEpoch,
          ...(this.advertiseHeartbeatProbeSupport && {
            supports_heartbeat_probe: true,
            current_interval_seconds: Math.round(this.heartbeatIntervalMs / 1000),
            ...(idleArg !== undefined && {
              idle_seconds: idleArg,
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
          countTowardEscalation: trigger === undefined,
          onLateSocketAnswer: (answer) => {
            state.succeededLateOnSocket = true;
            this.takeUpLateBeat(answer, lastHeartbeatSentAtMs, beat, idleArg);
          },
        },
      );
      if (!result.ok && result.reason === "closed") return;
      this.lastSettledBeat = Math.max(this.lastSettledBeat, beat);
      if (!result.ok && state.succeededLateOnSocket) {
        if (result.status === 429) this.lastHeartbeat429AtMs = Date.now();
        logForDebugging(
          "CCRClient: Heartbeat succeeded late on the worker socket; its POST failed, which is not counted as a missed heartbeat",
        );
      }
      if (!result.ok && !state.succeededLateOnSocket) {
        if (
          result.fetchFailed &&
          result.reason === "fetch_failed:TimeoutError" &&
          this.leavesPoolAfterServerError?.()
        )
          retirePoolAfterNoAnswer();
        if (trigger === "probe") logFeatureBad("ccr_heartbeat_probe", "beat_failed");
        else if (trigger === "resync_stale") logFeatureBad("ccr_reconnect_beat", "beat_failed");
        else if (trigger === "reactivate") logFeatureBad("ccr_reactivation_beat", "beat_failed");
        if (result.status === 429) {
          this.lastHeartbeat429AtMs = Date.now();
          if (trigger === "reactivate") this.restoreReactivationArm();
        }
        if (this.isIdleAdvised() && result.status !== 429) {
          logForDiagnosticsNoPII("warn", "cli_heartbeat_idle_reverted_on_failure", {
            status: result.status,
          });
          this.idleGrantLatched = false;
          this.reactivationBeatArmed = false;
          this.applyShorterIntervalNow(this.seedHeartbeatIntervalMs);
        }
        this.reclampCurrentIntervalToTokenLifetime();
        if (
          result.status !== undefined &&
          HEARTBEAT_FATAL_STATUSES.has(result.status) &&
          !result.nonOriginRefusal
        ) {
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
      if (trigger === "probe") logFeatureOk("ccr_heartbeat_probe");
      else if (trigger === "resync_stale") logFeatureOk("ccr_reconnect_beat");
      else if (trigger === "reactivate") logFeatureOk("ccr_reactivation_beat");
      if (result.ok) {
        logForDebugging("CCRClient: Heartbeat sent");
        await this.takeUpBeatAnswer(result.data, lastHeartbeatSentAtMs, beat, idleArg);
      }
    } finally {
      this.heartbeatInFlight = false;
      if (this.pendingForcedBeat && !this.closed) {
        this.pendingForcedBeat = false;
        this.refireForcedBeat();
      }
    }
  }
  async takeUpBeatAnswer(body, lastHeartbeatSuccessAtMs, beat, idleArg) {
    let answered = () => this.lastSucceededBeat > beat;
    if (this.lastSettledBeat <= beat) this.resetHeartbeatStreak();
    if (!answered()) {
      this.lastSucceededBeat = beat;
      this.lastHeartbeatSuccessAtMs = lastHeartbeatSuccessAtMs;
    }
    this.onRequestAuthOk?.();
    if (!answered() && isPlainObject(body)) this.takeUpFlushPolicy(body.event_flush_policy);
    if (body?.refreshed_auth && this.adoptRefreshedAuth) {
      let renewNeeded = false;
      try {
        let late = false;
        let adopt = this.adoptRefreshedAuth(body.refreshed_auth.expires_in_seconds);
        adopt.then(
          (row) => {
            if (late && row.adopted) {
              this.lastAuthRefreshBadReason = null;
              logFeatureOk("ccr_worker_auth_refresh");
              logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_late_adopted");
              this.renewSocketForNewToken();
            }
          },
          () => {},
        );
        let outcome = await withDeadline(adopt, Math.min(AUTH_REFRESH_TIMEOUT_MS, this.heartbeatIntervalMs));
        let result;
        if (outcome === undefined) {
          late = true;
          result = {
            adopted: false,
            reason: "adopt_timeout",
          };
        } else result = outcome;
        logForDiagnosticsNoPII("info", "cli_heartbeat_refreshed_auth_signal", {
          adopted: result.adopted,
          reason: result.reason,
          expires_in_seconds: body.refreshed_auth.expires_in_seconds,
        });
        if (result.adopted) {
          logFeatureOk("ccr_worker_auth_refresh");
          this.lastAuthRefreshBadReason = null;
          renewNeeded = true;
        } else if (
          result.reason &&
          result.reason !== "unchanged" &&
          result.reason !== this.lastAuthRefreshBadReason
        ) {
          this.lastAuthRefreshBadReason = result.reason;
          logFeatureBad("ccr_worker_auth_refresh", result.reason);
        }
      } catch {
        if (this.lastAuthRefreshBadReason !== "adopt_threw") {
          this.lastAuthRefreshBadReason = "adopt_threw";
          logFeatureBad("ccr_worker_auth_refresh", "adopt_threw");
        }
        logForDiagnosticsNoPII("error", "cli_heartbeat_refreshed_auth_adopt_threw");
      }
      if (renewNeeded) this.renewSocketForNewToken();
    }
    if (answered()) return;
    let heartbeatIntervalSeconds = body?.heartbeat_interval_seconds;
    if (
      typeof heartbeatIntervalSeconds !== "number" ||
      !Number.isFinite(heartbeatIntervalSeconds) ||
      heartbeatIntervalSeconds <= 0
    ) {
      if (this.idleGrantLatched) this.armReactivationIfEarned(idleArg, this.heartbeatIntervalMs / 1000);
      this.reclampCurrentIntervalToTokenLifetime();
      return;
    }
    if (this.advertiseHeartbeatProbeSupport) {
      let idle = heartbeatIntervalSeconds * 1000 > this.seedHeartbeatIntervalMs;
      if (idle) this.armReactivationIfEarned(idleArg, heartbeatIntervalSeconds);
      else this.reactivationBeatArmed = false;
      this.idleGrantLatched = idle;
    }
    let interval = this.clampToTokenLifetime(
      Math.min(
        Math.max(heartbeatIntervalSeconds * 1000, MIN_HEARTBEAT_INTERVAL_MS),
        this.maxAdvisedIntervalMs,
      ),
    );
    if (interval === this.heartbeatIntervalMs) return;
    logForDiagnosticsNoPII("info", "cli_heartbeat_interval_updated", {
      from_ms: this.heartbeatIntervalMs,
      to_ms: interval,
    });
    if (interval < this.heartbeatIntervalMs) this.applyShorterIntervalNow(interval);
    else this.heartbeatIntervalMs = interval;
  }
  async takeUpLateBeat(answer, at, beat, idle) {
    try {
      if (this.closed || !answer.ok) return;
      let body = await answer.json();
      if (this.closed) return;
      logForDebugging("CCRClient: Heartbeat answered late on the worker socket");
      this.consecutiveAuthFailures = 0;
      this.consecutiveNotFound = 0;
      await this.takeUpBeatAnswer(body, at, beat, idle);
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
  reportDurableUpload(events, outcome) {
    let resultThatMarks = this.resultThatMarks;
    if (
      outcome === "accepted" &&
      resultThatMarks &&
      resultThatMarks.marked !== this.sessionModelTurnStored &&
      events.some((event) => event.payload.uuid === resultThatMarks.uuid)
    ) {
      this.sessionModelTurnStored = resultThatMarks.marked;
      this.reportInternalMetadata({
        model_turn_stored: resultThatMarks.marked,
      });
    }
    if (outcome === "accepted")
      this.autocompactStateStored =
        events.findLast((event) => !event.ephemeral && event.payload.type === "autocompact_state")?.payload
          .value ?? this.autocompactStateStored;
    if (this.onDurableEventsUpload === undefined) return;
    let filtered = events.filter((event) => !event.ephemeral);
    if (filtered.length === 0) return;
    try {
      this.onDurableEventsUpload(filtered, outcome);
    } catch (error) {
      logForDebugging(
        `CCRClient: onDurableEventsUpload(${outcome}) threw; the batch's fate is unchanged: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  }
  writeEvent(event) {
    try {
      if (this.bufferLoneDelta(event)) return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
    return this.writeEvents([event]);
  }
  bufferLoneDelta(frame) {
    if (
      this.streamEventFlushIntervalMs <= 0 ||
      this.pickupBarriers.length > 0 ||
      this.guardsClientRows !== undefined ||
      frame.type !== "stream_event" ||
      frame.event.type !== "content_block_delta" ||
      "resume_reason" in frame
    )
      return false;
    this.streamedEphemeralSinceLastAssistant = true;
    this.bufferEphemeral(frame);
    return true;
  }
  trackFirstFrameUpload(uuid) {
    let timing = {};
    this.firstFrameUpload = {
      uuid,
      timing,
    };
    return timing;
  }
  trackFirstTextFrameUpload(uuid) {
    let timing = {};
    this.firstTextFrameUpload = {
      uuid,
      timing,
    };
    return timing;
  }
  trackFirstBlockFrameUpload(uuid) {
    let timing = {};
    this.firstBlockFrameUpload = {
      uuid,
      timing,
    };
    return timing;
  }
  trackedFrameUploads(field) {
    let list = [];
    for (let upload of [this.firstFrameUpload, this.firstTextFrameUpload, this.firstBlockFrameUpload])
      if (upload && upload.timing[field] === undefined) list.push(upload);
    return list;
  }
  writeEvents(event, opts) {
    let flattened = event.flatMap((event) => {
      if (
        event.type !== "system" ||
        (event.subtype !== "task_started" &&
          event.subtype !== "task_updated" &&
          event.subtype !== "task_notification")
      )
        return [event];
      let liveOnly =
        event.subtype !== "task_started"
          ? this.liveOnlyShellStarts.get(event.task_id)
          : classifyRowTypeForTelemetry(event) === "system/task_started_foreground_shell" &&
              this.shellTaskRowsLiveOnly()
            ? event
            : undefined;
      this.liveOnlyShellStarts.delete(event.task_id);
      if (!liveOnly) return [event];
      if (
        (event.subtype === "task_updated" && event.patch.is_backgrounded) ||
        Buffer.byteLength(jsonStringify(event)) > MAX_EVENT_PAYLOAD_BYTES
      )
        return liveOnly === event
          ? [event]
          : [
              {
                ...liveOnly,
              },
              event,
            ];
      if (event.subtype !== "task_notification") this.liveOnlyShellStarts.set(event.task_id, liveOnly);
      this.rowsMarkedLiveOnly.add(event);
      return [event];
    });
    let artifactSocketIds = this.artifactSocketIds;
    let filtered = (
      !artifactSocketIds
        ? flattened
        : flattened.flatMap((event) => {
            if (event.type !== "system") return [event];
            switch (event.subtype) {
              case "background_tasks_changed": {
                artifactSocketIds.clear();
                let filtered = event.tasks.filter((task) => {
                  if (task.task_type !== "monitor_ws" || task.ambient !== true) return true;
                  artifactSocketIds.add(task.task_id);
                  return false;
                });
                let signature = {
                  whole: jsonStringify(event.tasks),
                  withoutSockets: jsonStringify(filtered),
                };
                let unchanged =
                  this.lastTaskList !== undefined &&
                  signature.whole !== this.lastTaskList.whole &&
                  signature.withoutSockets === this.lastTaskList.withoutSockets;
                this.lastTaskList = signature;
                return unchanged
                  ? []
                  : [
                      {
                        ...event,
                        tasks: filtered,
                      },
                    ];
              }
              case "task_started":
                if (event.task_type !== "monitor_ws" || event.ambient !== true) return [event];
                artifactSocketIds.add(event.task_id);
                return [];
              case "task_updated":
                return artifactSocketIds.has(event.task_id) ? [] : [event];
              case "task_notification":
                return event.ambient === true && event.task_id.startsWith("s") ? [] : [event];
              default:
                return [event];
            }
          })
    ).filter((event) => {
      if (
        event.type === "system" &&
        event.subtype === "task_progress" &&
        event.summary === undefined &&
        event.workflow_progress === undefined
      )
        return false;
      if (event.type === "active_goal" || event.type === "autocompact_state") {
        let first = !this.stateRowTypesWritten.has(event.type);
        this.stateRowTypesWritten.add(event.type);
        let goal = this.recordAtStart?.goal;
        return !(
          first &&
          (event.type === "autocompact_state"
            ? import_sortedIndex_2(event.value, this.recordAtStart?.autocompact_state)
            : event.value === null &&
              this.recordAtStart !== undefined &&
              (!isPlainObject(goal) || goal.met === true))
        );
      }
      if (event.type !== "rate_limit_event") return true;
      let kind = classifyRowTypeForTelemetry(event);
      let repeated =
        kind === "rate_limit_event/allowed" &&
        kind === this.lastRateLimitKind &&
        event.rate_limit_info.overagePeriodMonthly === undefined &&
        event.rate_limit_info.overagePeriodChannel === undefined;
      this.lastRateLimitKind = kind;
      this.lastRateLimitRepeat =
        repeated && this.currentUploadTrim().rate_limit_repeats === true ? event : undefined;
      return this.lastRateLimitRepeat === undefined;
    });
    let index = filtered.findIndex((event) => event.type === "result");
    if (index !== -1 && this.lastRateLimitRepeat !== undefined) {
      filtered.splice(index, 0, this.lastRateLimitRepeat);
      this.lastRateLimitRepeat = undefined;
    }
    if (event.length > 0 && filtered.length === 0) return Promise.resolve();
    if (this.guardsClientRows !== undefined)
      this.reportClientRowsOwed(
        this.clientRowsAreGuarded()
          ? this.clientRowsOwed.rowsEntered(filtered, new Date())
          : this.clientRowsOwed.guardEnded(Date.now()),
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
      let mapped = filtered.map((row) =>
        this.isSettingsAnswer(row)
          ? settingsAnswersMaxWaitMs
          : isTopLevelSystemInit(row) ||
              (row.type === "user" && "isReplay" in row && row.isReplay && this.turnHold === "open")
            ? initMaxWaitMs
            : 0,
      );
      if (mapped.every((value) => value > 0)) {
        this.waitingAnswers.push(...filtered);
        this.waitingAnswersTimer ??= setTimeout(() => this.sendWaitingAnswers(), Math.min(...mapped));
        return Promise.resolve();
      }
    }
    let merged =
      this.waitingAnswers.length > 0 &&
      (filtered.length === 0 || filtered.some((row) => row.type !== "stream_event"))
        ? [...this.takeWaitingAnswers(), ...filtered]
        : filtered;
    let last = this.pickupBarriers.at(-1);
    if (!last) return this.writeEventsNow(merged, opts);
    let deferred = Promise.withResolvers();
    last.writes.push({
      messages: merged,
      opts,
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
    let requestId = this.settingsRequestIds.values().next().value;
    if (this.settingsRequestIds.size > MAX_SETTINGS_REQUEST_IDS && requestId !== undefined)
      this.settingsRequestIds.delete(requestId);
  }
  isSettingsAnswer(event) {
    return (
      event.type === "control_response" &&
      event.response.subtype === "success" &&
      this.settingsRequestIds.has(event.response.request_id)
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
  async writeEventsNow(events, opts) {
    let ready = [];
    let urgent = [];
    let bufferedSince;
    let release;
    let samplingEnd = false;
    let releasedBy;
    let releasedByType;
    let cutBackoff = false;
    let toolUseIds = [];
    let twinIndexes = [];
    let shellRows = [];
    let twinStamps = [];
    let repeatIndex;
    let droppedCount = false;
    for (let event of events) {
      let row = event.type === "stream_event" ? stripInputTransformations(event) : event;
      if (row.type === "stream_event" && row.event.type === "message_start" && !row.parent_tool_use_id) {
        this.modelCallStreamed = true;
        this.streamedResponseId = row.event.message.id;
        if (this.liveTwinTypes()?.size) {
          row = {
            ...row,
          };
          twinStamps.push({
            frame: row,
            at: ready.length,
            turnId: this.liveTurnId,
            index: this.nextLiveIndex,
          });
        }
      }
      if ((row.type === "assistant" || row.type === "user") && row.parent_tool_use_id)
        this.subAgentWroteSinceStoredRequesting = true;
      let requesting = this.noteRequestingRow(row);
      if (requesting) {
        let clientEvent = this.toClientEvent(requesting);
        ready.push(requesting === this.liveOnlyStartingRow ? this.withStamp(clientEvent) : clientEvent);
      }
      let hold = release ? undefined : this.holdAgainAt(row);
      let turnOpen = this.turnHold === "open";
      let releaseState = this.releaseFor(row, hold);
      if (releaseState === "event" && !release) releasedBy = classifyRowTypeForTelemetry(row);
      release ??= releaseState;
      if (turnOpen && releaseState === "round_trip" && this.flushPolicy?.holdAcrossModelCalls) {
        release = releaseState;
        releasedBy = undefined;
      }
      if (
        (turnOpen && releaseState === "round_trip") ||
        row.type === "result" ||
        row.type.startsWith("control_") ||
        (row.type === "system" &&
          "subtype" in row &&
          (row.subtype === "init" || row.subtype === "task_notification"))
      )
        releasedByType ??= classifyRowTypeForTelemetry(row);
      if (
        ((this.streamEventFirstFlushMs > 0 && !releaseState) ||
          this.noSubscriberStreamEventFlushIntervalMs > 0 ||
          this.dropUnwatchedStreamEvents ||
          (this.unwatched() && this.currentState === "running")) &&
        this.streamEventFlushIntervalMs > 0 &&
        isThinkingTokensSystemMessage(row)
      ) {
        this.bufferEphemeral(row);
        continue;
      }
      if (row.type === "stream_event") {
        this.streamedEphemeralSinceLastAssistant = true;
        if (
          row.event.type === "message_stop" &&
          this.holdRule === "served_policy" &&
          this.flushPolicy?.flushOnSamplingEnd
        ) {
          this.bufferEphemeral(row);
          bufferedSince ??= this.streamEventBufferedAt;
          samplingEnd = true;
          let taken = this.takeStreamEventBuffer();
          release ??= taken.release;
          ready.push(...taken.events);
          continue;
        }
        if (this.streamEventFlushIntervalMs <= 0) {
          let size = Buffer.byteLength(jsonStringify(row));
          if (size <= MAX_FRAME_BYTES)
            ready.push({
              payload: row,
              ephemeral: true,
            });
          else dropOversizeStreamEvent(row, size);
          continue;
        }
        this.bufferEphemeral(row);
        if (row.event.type === "content_block_start" && this.parkedRows.length > 0) {
          bufferedSince ??= this.streamEventBufferedAt;
          let taken = this.takeStreamEventBuffer();
          release ??= taken.release;
          ready.push(...taken.events);
        }
        continue;
      }
      let clientEvent = row.type === "control_request" ? this.toClientEvent(row) : undefined;
      if (
        row.type === "control_request" &&
        clientEvent !== undefined &&
        SERVED_CALL_REQUEST_SUBTYPES.has(getControlRequestSubtypeOfEvent(clientEvent)) &&
        this.servedCallRequestsJumpQueue()
      ) {
        if (!this.holdsAcrossModelCalls() && this.clientRowsOwed.rowsSentAgain.size === 0) {
          urgent.push(clientEvent);
          this.urgentRequestIds.add(row.request_id);
          let oldest = this.urgentRequestIds.values().next().value;
          if (this.urgentRequestIds.size > MAX_URGENT_REQUEST_IDS && oldest !== undefined)
            this.urgentRequestIds.delete(oldest);
          continue;
        }
        cutBackoff = true;
      }
      if (row.type === "control_cancel_request" && this.urgentRequestIds.delete(row.request_id)) {
        urgent.push(this.toClientEvent(row));
        continue;
      }
      if (row.type === "control_cancel_request" && this.holdsAcrossModelCalls()) cutBackoff = true;
      if (row.type === "assistant" && this.streamedEphemeralSinceLastAssistant) {
        logFeatureOk("ccr_partial_messages", {
          stream_events_dropped_unwatched: this.streamEventsDroppedUnwatched,
        });
        this.streamedEphemeralSinceLastAssistant = false;
        this.streamEventsDroppedUnwatched = 0;
      }
      if (releaseState === undefined && this.mayParkTextRow(row)) {
        this.parkedRows.push({
          message: row,
          event: this.toClientEvent(row),
        });
        continue;
      }
      if (this.streamEventTimer) {
        bufferedSince ??= this.streamEventBufferedAt;
        let buffered = this.takeStreamEventBuffer();
        release ??= buffered.release;
        ready.push(...buffered.events);
      }
      if (row.type === "keep_alive" && this.keepAlivesGoAlone()) {
        this.sendKeepAliveAlone();
        droppedCount = true;
        continue;
      }
      if (this.gatesToolCalls) {
        let mainThreadToolUseIds = getMainThreadToolUseIds(row);
        if (
          mainThreadToolUseIds.some((mainThreadToolUseId) => this.awaitedToolCalls.has(mainThreadToolUseId))
        )
          release ??= "tool_call";
        toolUseIds.push(...mainThreadToolUseIds);
      }
      let flushAfterToolNames = this.flushPolicy?.flushAfterToolNames;
      if (flushAfterToolNames && flushAfterToolNames.size > 0)
        for (let id of getMainThreadToolUseIds(row, flushAfterToolNames)) {
          this.toolCallsWhoseResultReleases.add(id);
          evictOldestIfFull(this.toolCallsWhoseResultReleases);
        }
      if (this.flushPolicy?.transcriptMaxAgeMs)
        for (let id of getMainThreadToolUseIds(row, READ_NOTIFICATIONS_TOOL_NAMES)) {
          this.toolCallsWhoseResultReleases.add(id);
          evictOldestIfFull(this.toolCallsWhoseResultReleases);
        }
      let holdAgain = this.flushPolicy?.holdAgain;
      if (holdAgain && row.type === "assistant" && !row.parent_tool_use_id) {
        if (row.message.id !== this.newestResponseId) {
          this.newestResponseId = row.message.id;
          this.unansweredCalls.clear();
        }
        for (let id of getMainThreadToolUseIds(row)) this.unansweredCalls.add(id);
        if (getMainThreadToolUseIds(row, holdAgain.neverAfterTools).length > 0)
          this.holdsNoMoreThisTurn = true;
        if (holdAgain.toolsWhoseResultsWait)
          for (let id of getMainThreadToolUseIds(row, holdAgain.toolsWhoseResultsWait)) {
            this.callsWhoseResultsWait.add(id);
            evictOldestIfFull(this.callsWhoseResultsWait);
          }
      }
      if (holdAgain && row.type === "user") {
        for (let id of collectContentBlockField(row.message, "tool_result", "tool_use_id"))
          this.unansweredCalls.delete(id);
        if (
          holdAgain.toolsWhoseResultsWait &&
          !row.parent_tool_use_id &&
          Array.isArray(row.message.content) &&
          row.message.content.some(
            (block) =>
              block.type === "tool_result" &&
              (block.is_error === true || !this.callsWhoseResultsWait.has(block.tool_use_id)),
          )
        )
          this.heldResultNeedsStore = true;
      }
      if (this.isLiveTwinRow(row)) twinIndexes.push(ready.length);
      if (
        row === this.liveOnlyRequestingRow &&
        this.holdsAcrossModelCalls() &&
        !(
          releaseState === "round_trip" &&
          !turnOpen &&
          (!this.subAgentWroteSinceStoredRequesting ||
            this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_BEHIND_SUB_AGENT)) &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_RELEASING) &&
          (hold !== "starts" ||
            (this.nextLiveIndex === this.indexBehindHeldToolResult &&
              this.flushPolicy.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_STARTING)))
        )
      ) {
        this.liveOnlyRequestingRow = undefined;
        repeatIndex = ready.length;
      }
      if (
        releaseState === "round_trip" &&
        row !== this.liveOnlyRequestingRow &&
        row !== this.liveOnlyFirstRow &&
        !("parent_tool_use_id" in row && row.parent_tool_use_id)
      )
        this.subAgentWroteSinceStoredRequesting = false;
      if (
        row.type === "system" &&
        row.subtype === "task_started" &&
        classifyRowTypeForTelemetry(row) === "system/task_started_foreground_shell" &&
        !this.isLiveOnlyRow(row)
      )
        shellRows.push([ready.length, row.task_id]);
      let emittedEvent = clientEvent ?? this.toClientEvent(row);
      if (hold === "starts")
        if (row === this.liveOnlyRequestingRow) this.liveOnlyStartingRow = row;
        else emittedEvent = this.withStamp(emittedEvent);
      if (
        row.type === "system" &&
        "subtype" in row &&
        row.subtype === "init" &&
        !emittedEvent.payload.parent_tool_use_id
      ) {
        this.liveTurnId = emittedEvent.payload.uuid;
        this.nextLiveIndex = 0;
        this.openTurn();
        this.droppedBeforeLiveTurn = this.droppedDurableBatches;
        if (
          REQUEST_FOLLOWS_INIT in row &&
          this.followsServedPolicy &&
          this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_FIRST) &&
          !(
            this.flushPolicy.holdAcrossModelCalls &&
            this.subAgentWroteSinceStoredRequesting &&
            !this.flushPolicy.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_BEHIND_SUB_AGENT)
          )
        ) {
          emittedEvent.payload.request_at_init = true;
          this.liveOnlyFirstRow = "next";
        }
      }
      if (!emittedEvent.ephemeral) this.indexBehindHeldToolResult = undefined;
      ready.push(emittedEvent);
    }
    let stamped = [];
    let heldRepeatUuid = this.heldRepeatUuid;
    if (!release && !samplingEnd) {
      let filtered = twinIndexes.filter((index) => {
        let event = ready[index];
        return event && !event.historical && this.eventUploader.holdsOnArrival(event);
      });
      if (
        !this.viewerAbsentReported &&
        filtered.some(
          (index) =>
            Buffer.byteLength(jsonStringify(ready[index]?.payload)) > MAX_EVENT_PAYLOAD_BYTES ||
            estimateJsonEncodedSize(ready[index]?.payload) > MAX_EVENT_PAYLOAD_ESTIMATED_BYTES,
        )
      )
        release = "twin_too_large";
      else {
        for (let [index, taskId] of shellRows) {
          let event = ready[index];
          if (event && this.eventUploader.holdsOnArrival(event)) this.heldShellTaskIds.add(taskId);
        }
        stamped = filtered;
        for (let index of filtered) {
          let event = ready[index];
          if (event) {
            if (index === repeatIndex) this.heldRepeatUuid = event.payload.uuid;
            ready[index] = this.withStamp(event);
          }
        }
        let last = filtered.length > 0 ? ready.findLast((event) => !event.ephemeral) : undefined;
        if (last?.payload.live_index !== undefined && hasToolResultContent(last.payload.message))
          this.indexBehindHeldToolResult = this.nextLiveIndex;
        if (!this.viewerAbsentReported)
          for (let index of filtered.toReversed()) {
            let event = ready[index];
            if (event)
              ready.splice(index, 0, {
                payload: event.payload,
                ephemeral: true,
              });
          }
      }
    }
    if (
      heldRepeatUuid !== undefined &&
      stamped.length > 0 &&
      (this.toolResultEndsCall ||
        (this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT_WAITING) &&
          ready.some(
            (event) => event.payload.type === "assistant" && event.payload.live_index !== undefined,
          )))
    ) {
      this.heldRepeatUuid = undefined;
      this.eventUploader.withdraw((event) => !event.ephemeral && event.payload.uuid === heldRepeatUuid);
    }
    for (let { frame, at, turnId, index } of twinStamps) {
      frame.live_turn_id = turnId;
      frame.live_next_index = index + countWhere(stamped, (stamp) => stamp < at);
    }
    if (urgent.length > 0)
      this.enqueueClientEvents(urgent, {
        urgent: true,
      });
    if (ready.length > 0) {
      if (release) {
        if (
          release !== "round_trip" &&
          twinIndexes.some((index) => ["assistant", "user"].includes(ready[index]?.payload.type ?? ""))
        )
          this.endWholeTurnHold(release);
        this.releaseTranscriptLane(release, releasedBy, releasedByType);
        this.heldResultNeedsStore = false;
      } else if (samplingEnd) release = "sampling_end";
      let promise = this.enqueueClientEvents(ready, {
        ...(release
          ? {
              release,
              releasedBy,
            }
          : {
              since: bufferedSince,
            }),
        ...(opts?.together && {
          together: true,
        }),
      });
      if (this.flushPolicy?.noTurnMaxAgeMs) this.applyUploadHold("reset");
      if (cutBackoff) this.eventUploader.cutBackoff();
      await promise;
      this.noteToolCallRows("client_events", toolUseIds, "queued");
    } else if ((urgent.length > 0 || droppedCount) && release) {
      if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
      this.releaseTranscriptLane(release, undefined, releasedByType);
      this.releaseClientEvents(release);
    } else if (samplingEnd) this.releaseClientEvents("sampling_end");
  }
  noteEventsPostFailed(rateLimited) {
    this.eventsPostRateLimited ||= rateLimited === 429;
    if (this.eventsPostsFailingSinceMs !== undefined) return;
    this.eventsPostsFailingSinceMs = performance.now();
    if (this.keepAlivesGoAlone() && env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES && hasActiveWork())
      this.sendKeepAliveAlone();
  }
  keepAlivesGoAlone() {
    return (
      this.eventsPostsFailingSinceMs !== undefined &&
      performance.now() - this.eventsPostsFailingSinceMs <= EVENTS_POST_FAILING_MAX_MS &&
      !this.eventsPostRateLimited &&
      !isEssentialTrafficOnly() &&
      this.providerWithheldReason() === undefined
    );
  }
  sendKeepAliveAlone() {
    if (this.closed || performance.now() - this.keepAliveAloneSentAtMs < VIEWER_LEFT_GRACE_MS) return;
    let event = {
      worker_epoch: this.workerEpoch,
      events: [
        this.toClientEvent({
          type: "keep_alive",
        }),
      ],
    };
    this.keepAliveAloneSentAtMs = performance.now();
    this.lastEventsAnswerOrPulseAtMs = Date.now();
    this.request("post", "/worker/events", event, "keep_alive (own POST)", {
      signal: this.closeAbort.signal,
      countTowardEscalation: false,
      outsideItsLane: true,
    })
      .then((response) => {
        this.eventsPostRateLimited ||= !response.ok && response.status === 429;
        if (response.ok) logFeatureOk("ccr_keep_alive_own_post");
        else if (!this.closed)
          logFeatureSad(
            "ccr_keep_alive_own_post",
            response.status !== undefined
              ? `http_${response.status}`
              : response.fetchFailed
                ? "no_answer"
                : "no_status",
          );
      })
      .catch(logError);
  }
  releaseTranscriptLane(release, releasedBy, event) {
    if (this.holdRule !== "served_policy" || !this.flushPolicy?.transcriptMaxAgeMs)
      this.internalEventUploader.release(release, releasedBy);
    else if (event !== undefined) this.internalEventUploader.release("event", event);
  }
  releaseFor(event, release) {
    if (event.type === "result") {
      let ended = this.turnHold !== "open";
      this.modelTurnEnded ||= ended;
      if (this.flushPolicy?.holdAgain?.laterWorkerHoldsFirstTurn && (ended || event.is_error))
        this.resultThatMarks = {
          uuid: event.uuid,
          marked: ended,
        };
      this.openTurn();
    }
    if (
      event.type === "system" &&
      "subtype" in event &&
      event.subtype === "status" &&
      "status" in event &&
      event.status === "requesting"
    ) {
      if (!this.seesModelCallBoundaries) {
        this.seesModelCallBoundaries = true;
        this.applyUploadHold("reset");
      }
      if (this.holdRule === "served_policy") {
        let mayWait = this.turnHold === "whole" && !release && this.requestingRowMayWait(event);
        if (
          this.turnHold === "open" &&
          this.flushPolicy?.firstTurnHoldsEachCall &&
          !this.modelTurnEnded &&
          !(this.flushPolicy.holdAgain?.laterWorkerHoldsFirstTurn && this.sessionModelTurnStored)
        ) {
          this.turnHold = "each_call";
          this.holdsNoMoreThisTurn = true;
        } else if (this.turnHold === "open" || release === "starts") {
          this.secondCallStartsHold = this.turnHold === "open" && !this.modelTurnEnded;
          this.turnHold = "whole";
          if (this.holdsAcrossModelCalls()) this.uploadHoldTally.wholeTurnHoldStarted();
        } else if (release === "ends") {
          this.turnHold = "each_call";
          this.uploadHoldTally.wholeTurnHoldEndedEarly();
        }
        return mayWait ? undefined : "round_trip";
      }
    }
    if (event.type === "user" && this.toolResultReleases(event.message)) return "tool_result";
    if (
      event.type === "assistant" &&
      event.message.id !== this.streamedResponseId &&
      this.isLiveTwinRow(event)
    )
      return "event";
    if (this.holdRule === undefined || this.mayWaitUnderHold(event)) return;
    return "event";
  }
  requestingRowMayWait(event) {
    return (
      this.holdsAcrossModelCalls() &&
      hasUserMessageUuids(event) &&
      !this.flushPolicy?.mustFlushTypes.has(event.type)
    );
  }
  holdAgainAt(event) {
    let holdAgain = this.flushPolicy?.holdAgain;
    if (
      !holdAgain ||
      event.type !== "system" ||
      !("subtype" in event) ||
      event.subtype !== "status" ||
      !("status" in event) ||
      event.status !== "requesting" ||
      !this.holdsAcrossModelCalls() ||
      !this.isLiveTwinRow(event)
    )
      return;
    if (this.holdsNoMoreThisTurn || this.droppedDurableBatches !== this.droppedBeforeLiveTurn) return "ends";
    let mayWait = this.requestingRowMayWait(event);
    if (this.unansweredCalls.size > 0) return mayWait ? undefined : "ends";
    let held = this.eventUploader.held();
    return this.turnHold === "each_call" ||
      !mayWait ||
      this.heldResultNeedsStore ||
      (holdAgain.laterWorkerHoldsFirstTurn && this.secondCallStartsHold) ||
      (holdAgain.softAgeMs > 0 && held.ageMs >= holdAgain.softAgeMs) ||
      (holdAgain.softEvents > 0 && held.count >= holdAgain.softEvents)
      ? "starts"
      : undefined;
  }
  toolResultReleases(message) {
    if (this.holdRule !== "served_policy") return false;
    let all = this.flushPolicy?.flushAfterTools === "all";
    return collectContentBlockField(message, "tool_result", "tool_use_id").some(
      (id) => all || this.toolCallsWhoseResultReleases.has(id),
    );
  }
  gateToolCall(call) {
    let flushPolicy = this.flushPolicy;
    if (
      !flushPolicy ||
      (flushPolicy.flushAfterTools !== "write" && flushPolicy.flushBeforeToolsWaitMs <= 0) ||
      call.agentId !== undefined ||
      this.closed ||
      !this.followsServedPolicy ||
      !call.mayWrite()
    )
      return;
    if (flushPolicy.flushAfterTools === "write") {
      this.toolCallsWhoseResultReleases.add(call.toolUseId);
      evictOldestIfFull(this.toolCallsWhoseResultReleases);
    }
    let lanes = this.transcriptLaneInUse ? ["client_events", "internal_events"] : ["client_events"];
    if (
      flushPolicy.flushBeforeToolsWaitMs <= 0 ||
      this.lanesNotAnswering.size > 0 ||
      call.signal.aborted ||
      lanes.every((lane) => this.toolCallRows[lane].get(call.toolUseId) === "stored")
    )
      return;
    return this.awaitToolCallStored(call, lanes, flushPolicy.flushBeforeToolsWaitMs);
  }
  async awaitToolCallStored(call, lanes, waitMs) {
    let toolUseId = call.toolUseId;
    let now = Date.now();
    let combinedAbortSignal = createCombinedAbortSignal(call.signal, {
      timeoutMs: waitMs,
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
    let queued = false;
    let graceTimedOut = false;
    try {
      this.releaseClientEvents("tool_call");
      this.internalEventUploader.release("tool_call");
      await Promise.race([
        this.toolCallRowReaches("client_events", toolUseId, "queued"),
        createChildAbortController(combinedAbortSignal_2.signal),
      ]);
      queued = this.toolCallRows.client_events.has(toolUseId);
      graceTimedOut = combinedAbortSignal_2.signal.aborted && !combinedAbortSignal.signal.aborted;
      if (queued && !this.closed)
        await Promise.race([
          Promise.all(lanes.map((lane) => this.toolCallRowReaches(lane, toolUseId, "settled"))),
          createChildAbortController(combinedAbortSignal.signal),
        ]);
    } finally {
      combinedAbortSignal_2.cleanup();
      combinedAbortSignal.cleanup();
      this.awaitedToolCalls.delete(toolUseId);
      for (let lane of lanes) this.toolCallRowWaiters.delete(`${lane} ${toolUseId}`);
    }
    let outcome = lanes.every((lane) => this.toolCallRows[lane].get(toolUseId) === "stored")
      ? "stored"
      : this.closed
        ? "closed"
        : call.signal.aborted
          ? "aborted"
          : lanes.some((lane) => this.toolCallRows[lane].get(toolUseId) === "dropped")
            ? "dropped"
            : graceTimedOut && !queued
              ? "row_never_queued"
              : "timeout";
    if (outcome === "timeout" || outcome === "dropped") {
      for (let lane of lanes)
        if (this.toolCallRows[lane].get(toolUseId) === "queued") this.lanesNotAnswering.add(lane);
    }
    logForDiagnosticsNoPII(
      outcome === "stored" || outcome === "closed" || outcome === "aborted" ? "info" : "warn",
      "cli_ccr_tool_call_upload_wait",
      {
        outcome,
        waited_ms: Date.now() - now,
        limit_ms: waitMs,
        live_view_row: this.toolCallRows.client_events.get(toolUseId) ?? "none",
        transcript_row: lanes.includes("internal_events")
          ? (this.toolCallRows.internal_events.get(toolUseId) ?? "none")
          : "lane_unused",
      },
    );
  }
  toolCallRowReaches(lane, toolUseId, until) {
    let state = this.toolCallRows[lane].get(toolUseId);
    if (state !== undefined && (state !== "queued" || until === "queued")) return Promise.resolve();
    return new Promise((resolve) => {
      let key = `${lane} ${toolUseId}`;
      let waiter = {
        until,
        reached: resolve,
      };
      let waiters = this.toolCallRowWaiters.get(key);
      if (waiters) waiters.push(waiter);
      else this.toolCallRowWaiters.set(key, [waiter]);
    });
  }
  noteToolCallRows(lane, ids, state) {
    let rows = this.toolCallRows[lane];
    for (let id of ids) {
      if ((state === "queued" && rows.has(id)) || (state === "dropped" && rows.get(id) === "stored"))
        continue;
      rows.set(id, state);
      evictOldestIfFull(rows);
      let key = `${lane} ${id}`;
      let filtered = (this.toolCallRowWaiters.get(key) ?? []).filter((waiter) => {
        if (waiter.until === "queued" || state !== "queued") {
          waiter.reached();
          return false;
        }
        return true;
      });
      if (filtered.length > 0) this.toolCallRowWaiters.set(key, filtered);
      else this.toolCallRowWaiters.delete(key);
    }
  }
  noteToolCallRowsSettled(lane, state, events) {
    if (!this.gatesToolCalls) return;
    if (state === "stored") this.lanesNotAnswering.delete(lane);
    this.noteToolCallRows(
      lane,
      events.flatMap((event) =>
        ("session_agent_id" in event && event.session_agent_id) || ("ephemeral" in event && event.ephemeral)
          ? []
          : getMainThreadToolUseIds(event.payload),
      ),
      state,
    );
  }
  clientRowsAreGuarded() {
    if (!this.clientRowsSwitchIsOn || this.hasDisplayHooks === undefined) return false;
    this.displayHookSeen ||= this.hasDisplayHooks();
    return !this.displayHookSeen;
  }
  flagsRefreshed() {
    this.clientRowsSwitchIsOn = this.guardsClientRows?.() === true;
    return this.clientRowsSwitchIsOn;
  }
  markOfRepliesShownAsStored() {
    return this.clientRowsAreGuarded() ? sessionIdBody(this.sessionId) || undefined : undefined;
  }
  setDisplayHooksProbe(hasDisplayHooks) {
    this.hasDisplayHooks = hasDisplayHooks;
  }
  noteClientRowsSettled(state, events) {
    if (this.guardsClientRows === undefined) return;
    if (!this.clientRowsAreGuarded()) {
      this.reportClientRowsOwed(this.clientRowsOwed.guardEnded(Date.now()));
      if (this.clientRowsOwed.rowsSentAgain.size === 0) return;
    }
    let flattened = events.flatMap((event) => (event.ephemeral ? [] : [event.payload.uuid]));
    let againCount = countWhere(flattened, (uuid) => this.clientRowsOwed.rowsSentAgain.has(uuid));
    if (againCount > 0) {
      this.ownRowsWaitBehindRowsSentAgainSince = undefined;
      if (state === "stored")
        logFeatureOk("ccr_client_rows_owed", {
          rows: againCount,
        });
      else
        logFeatureBad("ccr_client_rows_owed", "upload_refused", {
          rows: againCount,
        });
    }
    this.reportClientRowsOwed(this.clientRowsOwed.rowsAnswered(flattened));
  }
  reportClientRowsOwed(metadata) {
    if (metadata !== undefined)
      this.workerState.enqueue({
        internal_metadata: metadata,
      });
  }
  async clientRowsOwedByEarlierWorkers(flagsLoaded) {
    if (this.guardsClientRows === undefined || this.clientRowsOwed.earlierSpans.length === 0) return [];
    await flagsLoaded();
    return this.flagsRefreshed() ? this.clientRowsOwed.earlierSpans : [];
  }
  async tryClientRowsOwedByEarlierWorkers(afterUuid) {
    this.reportClientRowsOwed(this.clientRowsOwed.earlierSpansTried(afterUuid));
    if (!(await withDeadline(this.flushWorkerState(), WORKER_STATE_FLUSH_TIMEOUT_MS)))
      logFeatureSad("ccr_client_rows_owed", "try_report_unanswered");
  }
  async sendOwedClientRowsAgain(rows) {
    if (!this.flagsRefreshed()) return;
    let events = uniqByExport(
      rows.map((row) => this.toClientEvent(row)),
      (event) => event.payload.uuid,
    );
    this.clientRowsOwed.earlierRowsSentAgain(events.map((event) => event.payload.uuid));
    try {
      await this.enqueueClientEvents(events, {
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
  rowsSentAgainStepAside(events) {
    let { rowsSentAgain } = this.clientRowsOwed;
    if (!events.some((event) => rowsSentAgain.has(event.payload.uuid))) return;
    if (this.eventUploader.backlog().unsent <= rowsSentAgain.size) {
      this.ownRowsWaitBehindRowsSentAgainSince = undefined;
      return;
    }
    this.ownRowsWaitBehindRowsSentAgainSince ??= Date.now();
    if (Date.now() - this.ownRowsWaitBehindRowsSentAgainSince < ROWS_SENT_AGAIN_WAIT_MS) return;
    this.ownRowsWaitBehindRowsSentAgainSince = undefined;
    let uuids = new Set(rowsSentAgain);
    events.splice(0, events.length, ...events.filter((event) => !isHistoricalPayloadSeen(event, uuids)));
    this.eventUploader.withdraw((event) => isHistoricalPayloadSeen(event, uuids));
    logFeatureSad("ccr_client_rows_owed", "upload_kept_failing", {
      rows: uuids.size,
    });
    this.clientRowsOwed.earlierRowsWithdrawn();
  }
  mayParkTextRow(row) {
    if (
      row.type !== "assistant" ||
      !this.streamEventTimer ||
      this.streamEventTimerIsSlow ||
      this.lastReportedHasSubscribers === false ||
      this.closed ||
      this.isLiveTwinRow(row)
    )
      return false;
    let content = row.message.content;
    return Array.isArray(content) && content.length > 0 && content.every((block) => block.type === "text");
  }
  liveTwinTypes() {
    return this.holdRule === "served_policy" && this.liveTurnId !== undefined && this.turnHold !== "open"
      ? this.flushPolicy?.liveTwinTypes
      : undefined;
  }
  isLiveTwinRow(row) {
    let types = this.liveTwinTypes();
    return (
      types !== undefined &&
      (row.type === "tool_progress"
        ? row.heartbeat === true
        : !("parent_tool_use_id" in row && row.parent_tool_use_id)) &&
      (row.type !== "user" ||
        (Array.isArray(row.message.content) &&
          row.message.content.every((block) => block.type === "tool_result"))) &&
      (types.has(row.type) || ("subtype" in row && types.has(`${row.type}/${row.subtype}`)))
    );
  }
  takeParkedRows() {
    let mapped = this.parkedRows.map(({ event }) => event);
    this.parkedRows = [];
    return mapped;
  }
  mayWaitUnderHold(row) {
    if (this.isLiveOnlyRow(row)) return true;
    if (row.type === "keep_alive" && this.holdRule === "served_policy")
      return this.seesModelCallBoundaries && !this.flushPolicy?.mustFlushTypes.has(row.type);
    if (
      row.type === "control_response" &&
      this.flushPolicy?.controlTrafficKeepsHold &&
      this.holdsAcrossModelCalls()
    )
      return (
        !this.flushPolicy.mustFlushTypes.has(row.type) && this.settingsRequestIds.has(row.response.request_id)
      );
    if (!isEphemeralStreamMessage(row))
      return (
        this.holdRule === "served_policy" &&
        this.seesModelCallBoundaries &&
        this.turnHold !== "open" &&
        this.flushPolicy?.mayWaitTypes.has(
          row.type === "system" &&
            row.subtype === "task_notification" &&
            this.heldShellTaskIds.has(row.task_id)
            ? "system/task_notification_foreground_shell"
            : classifyRowTypeForTelemetry(row),
        ) === true &&
        !this.flushPolicy.mustFlushTypes.has(row.type)
      );
    if (this.holdRule === "no_subscriber_flag" && !DEBUG_STATE_DUMP) return true;
    if (row.type === "user" && "isReplay" in row && row.isReplay) return false;
    let flushPolicy = this.flushPolicy;
    if (!flushPolicy) return true;
    if (row.type === "assistant" && flushPolicy.flushOnAssistant) return false;
    return !flushPolicy.mustFlushTypes.has(row.type);
  }
  isLiveOnlyRow(row) {
    return (
      this.rowsMarkedLiveOnly.has(row) ||
      (this.followsServedPolicy &&
        this.flushPolicy?.liveOnlyTypes.has(classifyRowTypeForTelemetry(row)) === true)
    );
  }
  noteRequestingRow(row) {
    if ("parent_tool_use_id" in row && row.parent_tool_use_id) return;
    if ("resume_reason" in row && row.resume_reason) this.turnTookInput = true;
    if (row.type === "assistant" || row.type === "user") {
      this.toolResultEndsCall = row.type === "user" && hasToolResultContent(row.message);
      this.liveOnlyRequestingRow = undefined;
    }
    if (row.type !== "system" || !("subtype" in row)) return;
    let status = row.subtype === "status" && "status" in row ? row.status : undefined;
    if (status === "compacting" || row.subtype === "compact_boundary") {
      let liveOnlyRequestingRow = this.liveOnlyRequestingRow;
      this.liveOnlyRequestingRow = undefined;
      return liveOnlyRequestingRow;
    }
    if (status !== "requesting") return;
    let list = jsonStringify("user_message_uuids" in row ? (row.user_message_uuids ?? null) : null);
    let repeat =
      list === this.lastRequestingList &&
      this.toolResultEndsCall &&
      !this.turnTookInput &&
      this.followsServedPolicy &&
      this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_REPEAT) === true;
    if (this.liveOnlyFirstRow === "next") this.liveOnlyFirstRow = row;
    this.lastRequestingList = list;
    this.toolResultEndsCall = false;
    this.liveOnlyRequestingRow = repeat ? row : undefined;
    if (
      row !== this.liveOnlyFirstRow &&
      this.flushPolicy?.liveOnlyTypes.has(SYSTEM_STATUS_REQUESTING_AFTER_INPUT)
    )
      this.turnTookInput = false;
    this.heldRepeatUuid = undefined;
    return;
  }
  withStamp(event) {
    return {
      ...event,
      payload: {
        ...event.payload,
        live_turn_id: this.liveTurnId,
        live_index: this.nextLiveIndex++,
        emitted_at_ms: Date.now(),
      },
    };
  }
  toClientEvent(row) {
    let capped = capLiveOnlyResponseSize(row, MAX_LIVE_RESPONSE_BYTES);
    let historical = capped.historical === true;
    let ephemeral =
      isThinkingTokensSystemMessage(row) ||
      isLiveOnlyResponse(capped) ||
      this.isLiveOnlyRow(row) ||
      row === this.liveOnlyRequestingRow ||
      row === this.liveOnlyFirstRow;
    let toolResult =
      capped.type === "user"
        ? this.uploadedToolResult(capped.tool_use_result, capped.message, capped.is_virtual === true)
        : capped.tool_use_result;
    return {
      payload: {
        ...capped,
        ...(toolResult !== capped.tool_use_result && {
          tool_use_result: toolResult,
        }),
        uuid: typeof capped.uuid === "string" ? capped.uuid : randomUUID(),
      },
      ...(historical && {
        historical: true,
      }),
      ...(ephemeral && {
        ephemeral: true,
      }),
    };
  }
  uploadedToolResult(uuid, size, keepWhole) {
    let result = keepWhole ? uuid : this.trimmedToolResult(uuid, size);
    if (!this.withholdsWholeFiles) return result;
    let withheld = withholdFileBodiesDeep(result);
    if (withheld !== result && !this.loggedWholeFileWithheld) {
      this.loggedWholeFileWithheld = true;
      logFeatureOk("ccr_whole_file_withheld");
    }
    return withheld;
  }
  trimmedToolResult(result, message) {
    let trim = this.currentUploadTrim();
    let stripped = stripInlineMediaBase64(result, trim);
    if (stripped !== result && !this.loggedToolResultBlank) {
      this.loggedToolResultBlank = true;
      logFeatureOk("ccr_tool_result_blank");
    }
    let deduped = dedupeMcpImageData(stripped, message, trim);
    if (deduped !== stripped && !this.loggedMcpImageBlank) {
      this.loggedMcpImageBlank = true;
      logFeatureOk("ccr_mcp_image_blank");
    }
    return deduped;
  }
  setStreamEventFlushIntervalMs(ms) {
    this.streamEventFlushIntervalMs = parseFlushIntervalMs(
      "streamEventFlushIntervalMs",
      ms,
      DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
    );
    if (this.streamEventFlushIntervalMs <= 0 && this.streamEventTimer) this.flushStreamEventBuffer();
    if (this.streamEventFlushIntervalMs <= 0) this.toolInputMayWait = false;
  }
  setStreamEventFirstFlushMs(ms) {
    this.streamEventFirstFlushMs = parseFlushIntervalMs("streamEventFirstFlushMs", ms, 0);
  }
  setStreamEventWindowRunsFromLastFlush(value) {
    this.streamEventWindowRunsFromLastFlush = value === true;
  }
  setHeldBunchFlushMs(value) {
    this.heldBunchFlushMs = parseFlushIntervalMs("heldBunchFlushMs", value, DEFAULT_HELD_BUNCH_FLUSH_MS);
  }
  setToolInputFlushMs(value) {
    this.toolInputFlushMs = clampToolInputFlushMs(value);
  }
  setNoSubscriberStreamEventFlushIntervalMs(ms) {
    let flushIntervalMs = parseFlushIntervalMs("noSubscriberStreamEventFlushIntervalMs", ms, 0);
    if (flushIntervalMs === this.noSubscriberStreamEventFlushIntervalMs) return;
    this.noSubscriberStreamEventFlushIntervalMs = flushIntervalMs;
    this.setHasSubscribers(undefined, "reset");
  }
  setNoSubscriberUploadHoldMs(ms) {
    let flushIntervalMs = parseFlushIntervalMs("noSubscriberUploadHoldMs", ms, 0);
    if (flushIntervalMs === this.noSubscriberUploadHoldMs) return;
    this.noSubscriberUploadHoldMs = flushIntervalMs;
    this.setHasSubscribers(undefined, "reset");
  }
  setDropUnwatchedStreamEvents(value) {
    let enabled = value === true;
    if (enabled === this.dropUnwatchedStreamEvents) return;
    this.setHasSubscribers(undefined, "reset");
    this.dropUnwatchedStreamEvents = enabled;
  }
  onSubscribersReported;
  setSubscribersReportedListener(onSubscribersReported) {
    this.onSubscribersReported = onSubscribersReported;
  }
  tellSubscribersReported(has) {
    if (typeof has !== "boolean" || this.onSubscribersReported === undefined) return;
    if (has || !this.senderMayNotBeAttachedYet()) this.onSubscribersReported(has);
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
  checkpointForViewer(trigger) {
    if (this.closed || this.viewerCheckpointTimer || !this.holdsAcrossModelCalls()) return;
    this.viewerCheckpointTimer = setTimeout(
      (uploader, trigger) => {
        uploader.viewerCheckpointTimer = null;
        if (uploader.holdsAcrossModelCalls()) uploader.uploadHeldRowsForViewer(trigger).catch(logError);
      },
      Math.max(0, this.lastViewerCheckpointAtMs + VIEWER_CHECKPOINT_INTERVAL_MS - Date.now()),
      this,
      trigger,
    );
  }
  async uploadHeldRowsForViewer(trigger) {
    this.lastViewerCheckpointAtMs = Date.now();
    if (this.flushPolicy?.emptyCheckpointKeepsHold && !this.modelCallStreamed)
      this.setHasSubscribers(undefined, "watcher");
    else this.endWholeTurnHold(trigger);
    let liveTurnId = this.liveTurnId;
    let lastIndex = this.nextLiveIndex - 1;
    let droppedBeforeLiveTurn = this.droppedBeforeLiveTurn;
    this.internalEventUploader.release(trigger);
    this.releaseClientEvents(trigger);
    await this.flush();
    await this.enqueueClientEvents(
      [
        {
          payload: {
            type: "system",
            subtype: "checkpoint_done",
            uuid: randomUUID(),
            live_turn_id: liveTurnId,
            stored_through_live_index: this.droppedDurableBatches === droppedBeforeLiveTurn ? lastIndex : -1,
          },
          ephemeral: true,
        },
      ],
      {},
    );
  }
  endWholeTurnHold(reason) {
    if (this.turnHold === "open") return;
    this.turnHold = "each_call";
    this.uploadHoldTally.wholeTurnHoldEndedEarly();
    if (!reason || !this.flushPolicy?.holdAgain?.after.has(reason)) this.holdsNoMoreThisTurn = true;
  }
  openTurn() {
    this.lastRequestingList = undefined;
    this.liveOnlyFirstRow = undefined;
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
  applyUploadHold(reason) {
    let rule = this.decideHoldRule();
    this.holdRule = rule;
    this.eventUploader.setHold(
      rule &&
        this.laneHold(
          rule,
          !this.seesModelCallBoundaries
            ? neverFlush
            : this.flushPolicy?.controlTrafficKeepsHold
              ? isEphemeralKeepAliveOrControlResponse
              : isEphemeralOrKeepAlive,
          this.turnHold === "open" ? this.flushPolicy?.noTurnMaxAgeMs : undefined,
        ),
      reason,
    );
    this.internalEventUploader.setHold(
      rule && this.laneHold(rule, neverFlush, this.flushPolicy?.transcriptMaxAgeMs),
      reason,
    );
  }
  laneHold(rule, passes, maxAgeMs) {
    let flushPolicy = this.flushPolicy;
    if (rule === "served_policy" && flushPolicy)
      return {
        rule,
        maxAgeMs: Math.min(
          maxAgeMs || flushPolicy.maxAgeMs,
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
  takeUpFlushPolicy(policy) {
    let raw = policy ?? this.launchFlushPolicy;
    let parsed = raw == null ? undefined : parseHoldPolicy(raw);
    if (raw != null && !parsed && !this.loggedUnreadableFlushPolicy) {
      this.loggedUnreadableFlushPolicy = true;
      logForDiagnosticsNoPII("warn", "cli_ccr_flush_policy_unreadable");
    }
    let flushPolicy = this.flushPolicy;
    if (!summarizeAssistantMessage(flushPolicy, parsed)) {
      this.flushPolicy = parsed;
      this.callsWhoseResultsWait.clear();
      if (
        flushPolicy?.flushAfterTools !== parsed?.flushAfterTools ||
        !setsEqual(flushPolicy?.flushAfterToolNames, parsed?.flushAfterToolNames)
      )
        this.toolCallsWhoseResultReleases.clear();
      logForDiagnosticsNoPII(
        "info",
        parsed
          ? flushPolicy
            ? "cli_ccr_flush_policy_changed"
            : "cli_ccr_flush_policy_adopted"
          : "cli_ccr_flush_policy_cleared",
        {
          ...(parsed && {
            max_events: parsed.maxEvents,
            max_age_ms: parsed.maxAgeMs,
            max_bytes: parsed.maxBytes ?? 0,
            flush_on_sampling_end: parsed.flushOnSamplingEnd,
            flush_on_assistant: parsed.flushOnAssistant,
            event_batch_upload: parsed.eventBatchUpload,
            hold_across_model_calls: parsed.holdAcrossModelCalls,
            hold_again: parsed.holdAgain !== undefined,
            may_wait_types: parsed.mayWaitTypes.size,
            may_wait_types_refused: parsed.mayWaitTypesRefused,
            flush_after_tool_names: parsed.flushAfterToolNames.size,
            settings_receipts_max_wait_ms: parsed.settingsReceiptsMaxWaitMs,
            messages_received_waits: parsed.messagesReceivedWaits,
            receipts_ride_uploads: parsed.receiptsRideUploads,
            flush_before_tools_wait_ms: parsed.flushBeforeToolsWaitMs,
            flush_after_tools: parsed.flushAfterTools,
            must_flush_types: parsed.mustFlushTypes.size,
            live_twin_types: parsed.liveTwinTypes.size,
            live_only_types: parsed.liveOnlyTypes.size,
            transcript_max_age_ms: parsed.transcriptMaxAgeMs,
            no_turn_max_age_ms: parsed.noTurnMaxAgeMs,
            merge_worker_reports: parsed.mergeWorkerReports,
            control_traffic_keeps_hold: parsed.controlTrafficKeepsHold,
            empty_checkpoint_keeps_hold: parsed.emptyCheckpointKeepsHold,
            first_turn_holds_each_call: parsed.firstTurnHoldsEachCall,
            later_worker_holds_first_turn: parsed.holdAgain?.laterWorkerHoldsFirstTurn === true,
            settings_answers_max_wait_ms: parsed.settingsAnswersMaxWaitMs,
            init_max_wait_ms: parsed.initMaxWaitMs,
            metadata_waits_for_status: parsed.metadataWaitsForStatus.size,
            metadata_never_sent: parsed.metadataNeverSent.size,
            metadata_max_wait_ms: parsed.metadataMaxWaitMs,
            cost_report_max_wait_ms: parsed.costReportMaxWaitMs,
            policy_version: parsed.policyVersion ?? "",
          }),
          hold_enabled: this.followsServedPolicy,
        },
      );
      this.applyUploadHold("reset");
    }
  }
  logUploadHoldEnd(lane, reason, heldCount, heldMs, rule, releasedBy) {
    if (rule === "no_subscriber_flag") {
      logFeatureOk("ccr_no_subscriber_hold", {
        lane: fromEnum(lane),
        reason: fromEnum(reason),
        held_events: heldCount,
        held_ms: heldMs,
      });
      return;
    }
    if (lane === "client_events") {
      this.heldShellTaskIds.clear();
      this.heldRepeatUuid = undefined;
      this.indexBehindHeldToolResult = undefined;
      if (reason !== "round_trip") this.endWholeTurnHold(reason);
    }
    this.uploadHoldTally.released(lane, heldCount, heldMs);
    logForDiagnosticsNoPII("info", "cli_ccr_event_hold_release", {
      lane,
      reason,
      ...(releasedBy !== undefined && {
        released_by: releasedBy,
      }),
      held_events: heldCount,
      held_ms: heldMs,
    });
  }
  uploadBody(events, hold) {
    let body = {
      worker_epoch: this.workerEpoch,
      events,
    };
    if (this.uploadHoldMarker())
      body.upload_hold = {
        held: hold.held,
        flush_reason: hold.reason,
        held_count: clampInt32(hold.heldCount),
        hold_age_ms: clampInt32(hold.holdAgeMs),
        inflight_retry_count: clampInt32(hold.retryCount),
        hold_rule: hold.rule,
        post_index: clampInt32(hold.postIndex),
        ...(this.flushPolicy?.policyVersion !== undefined && {
          policy_version: this.flushPolicy.policyVersion,
        }),
      };
    return body;
  }
  retrySmaller(
    lane,
    events,
    opts,
    timeoutMs,
    size = {
      bytes: opts.bytes,
    },
  ) {
    let fields = {
      count: events.length,
      kib: Math.round(size.bytes / 1024),
      retry_count: opts.retryCount,
      timeout_ms: timeoutMs,
    };
    logForDebugging(
      `CCRClient: ${lane} POST of ${fields.count} event(s), ${fields.kib} KiB got no response (the connection failed, or no answer within ${timeoutMs}ms) after ${fields.retry_count} earlier failure(s); ${size.bytes >= LARGE_BATCH_BYTES && opts.cuttable ? "retrying it in smaller batches" : "retrying it"}`,
      {
        level: "warn",
      },
    );
    logForDiagnosticsNoPII(
      "warn",
      lane === "client_events" ? "cli_worker_events_no_response" : "cli_worker_internal_events_no_response",
      fields,
    );
    return new ClientEventTooSmallError(`${lane} POST got no response`, LARGE_BATCH_BYTES);
  }
  logUploadDrain(lane, stats) {
    if (!this.uploadHoldMarker()) return;
    logFeatureOk("ccr_upload_drain", {
      lane: fromEnum(lane),
      trigger: fromEnum(stats.trigger),
      rule: fromEnum(stats.rule),
      held_events: stats.heldEvents,
      held_ms: stats.heldMs,
      posts: stats.posts,
      rows: stats.rows,
      max_rows_post: stats.maxRowsPost,
      failed_posts: stats.failedPosts,
      dropped_rows: stats.droppedRows,
      other_posts: stats.otherPosts,
      other_rows: stats.otherRows,
      drain_ms: stats.drainMs,
    });
  }
  logUndeliveredAtClose(lane, count) {
    if (lane === "client_events") this.undeliveredClientEventsAtClose ??= count;
    else this.undeliveredInternalEventsAtClose ??= count;
    if (this.shutdownKeepsClientEvents)
      logForDebugging(`CCRClient: ${lane} lane closed at shutdown, ${count} undelivered`, {
        level: count > 0 ? "warn" : "info",
      });
    if (count <= 0) return;
    if (this.noSubscriberUploadHoldMs > 0 && this.viewerAbsentReported)
      logFeatureSad(
        "ccr_no_subscriber_hold",
        this.closingForSuccessor ? "undelivered_at_rebuild" : "undelivered_at_close",
        {
          lane: fromEnum(lane),
          undelivered_events: count,
        },
      );
    if (this.servedPolicyHolds())
      logForDiagnosticsNoPII("warn", "cli_ccr_event_hold_undelivered_at_close", {
        lane,
        undelivered_events: count,
        for_successor: this.closingForSuccessor,
      });
  }
  bufferEphemeral(event) {
    let deltaType =
      this.streamEventFirstFlushMs > 0 && event.type === "stream_event" ? event.event.type : undefined;
    let blockStart = deltaType === "content_block_start";
    if (blockStart) this.firstContentFlushPending = true;
    let event_2 = event.type === "stream_event" && !event.parent_tool_use_id ? event.event : undefined;
    if (event_2?.type === "content_block_start") {
      this.toolInputMayWait =
        event_2.content_block.type === "tool_use" &&
        TOOLS_WHOSE_INPUT_MAY_WAIT.has(event_2.content_block.name);
      this.toolInputChars = 0;
    }
    let overChars = this.toolInputChars >= MAX_TOOL_INPUT_CHARS_BEFORE_FLUSH;
    let inputMayWait = false;
    if (event_2?.type === "content_block_delta" && event_2.delta.type === "input_json_delta") {
      this.toolInputChars += event_2.delta.partial_json.length;
      inputMayWait = this.toolInputMayWait && this.toolInputFlushMs > 0;
    }
    if (this.dropUnwatchedStreamEvents && this.unwatchedPastGrace) {
      if (event.type === "stream_event") this.streamEventsDroppedUnwatched++;
      return;
    }
    this.streamEventBuffer.push(event);
    let firstDelta = this.firstContentFlushPending && deltaType === "content_block_delta";
    if (firstDelta) this.firstContentFlushPending = false;
    let flushNow = blockStart || (firstDelta && !inputMayWait);
    if (
      firstDelta &&
      this.firstDeltaFlushTimer === null &&
      event.type === "stream_event" &&
      event.event.type === "content_block_delta" &&
      event.event.delta.type !== "input_json_delta" &&
      !(
        this.lastReportedHasSubscribers === false &&
        (this.noSubscriberStreamEventFlushIntervalMs > 0 || this.noSubscriberUploadHoldMs > 0)
      )
    )
      this.firstDeltaFlushTimer = setTimeout(() => {
        this.firstDeltaFlushTimer = null;
        this.flushStreamEventBuffer(true);
      }, 0);
    let slow = this.streamEventTimerIsSlow && !inputMayWait;
    if (this.streamEventTimer && !flushNow && !slow) return;
    let toolInputSlow = inputMayWait && overChars;
    this.streamEventTimerIsSlow = toolInputSlow;
    let now = Date.now();
    let max = Math.max(this.toolInputFlushMs, this.streamEventFlushIntervalMs);
    let delay = flushNow
      ? Math.min(this.streamEventFirstFlushMs, this.streamEventFlushIntervalMs)
      : toolInputSlow
        ? Math.min(Math.max(this.streamEventsTakenAt + max - now, this.streamEventFlushIntervalMs), max)
        : this.streamEventWindowRunsFromLastFlush
          ? Math.min(
              Math.max(
                this.streamEventsTakenAt + this.streamEventFlushIntervalMs - now,
                this.heldBunchFlushMs,
              ),
              this.streamEventFlushIntervalMs,
            )
          : this.streamEventFlushIntervalMs;
    if (delay > this.streamEventFlushIntervalMs && !this.loggedToolInputFlush) {
      this.loggedToolInputFlush = true;
      logFeatureOk("ccr_tool_input_flush");
    }
    let wait =
      this.lastReportedHasSubscribers === false
        ? Math.max(this.noSubscriberStreamEventFlushIntervalMs, this.noSubscriberUploadHoldMs, delay)
        : delay;
    if (this.streamEventTimer) {
      if (now + wait >= this.streamEventFlushDueAt) return;
      clearTimeout(this.streamEventTimer);
    } else this.streamEventBufferedAt = now;
    this.streamEventFlushDueAt = now + wait;
    this.streamEventTimer = setTimeout(() => void this.flushStreamEventBuffer(), wait);
  }
  setHasSubscribers(reported, source) {
    this.hasSubscribersReports++;
    let value =
      typeof reported === "boolean" && (reported || !this.senderMayNotBeAttachedYet()) ? reported : undefined;
    let lastReportedHasSubscribers = this.lastReportedHasSubscribers;
    this.lastReportedHasSubscribers = value;
    if (value === true) this.viewerReportedSinceLastFalse = true;
    else if (value === false && this.viewerReportedSinceLastFalse) {
      this.viewerReportedSinceLastFalse = false;
      this.lastViewerLeftAtMs = Date.now();
    }
    let unwatchedPastGrace = this.unwatchedPastGrace;
    this.unwatchedPastGrace =
      value === false && Date.now() - this.lastViewerLeftAtMs >= UNWATCHED_VIEWER_LEFT_GRACE_MS;
    if (this.dropUnwatchedStreamEvents && unwatchedPastGrace !== this.unwatchedPastGrace)
      logForDebugging(
        this.unwatchedPastGrace
          ? "CCRClient: no subscribers reported; dropping stream deltas until one is"
          : `CCRClient: resuming stream deltas (${value === true ? "watcher" : source})`,
      );
    if (lastReportedHasSubscribers === false && value !== false && this.streamEventTimer)
      this.flushStreamEventBuffer();
    let holdSource = value === true ? "watcher" : source;
    if (value === false) this.viewerAbsentReported = true;
    else if (this.viewerAbsentReported && holdSource === "watcher") {
      this.viewerAbsentReported = false;
      if (this.holdRule === "served_policy") {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        this.releaseClientEvents("watcher");
        this.internalEventUploader.release("watcher");
      }
    }
    this.applyUploadHold(holdSource);
  }
  async flushStreamEventBuffer(atTurnEnd = false) {
    let { events, release } = this.takeStreamEventBuffer(atTurnEnd);
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
  enqueueClientEvents(events, opts) {
    for (let upload of this.trackedFrameUploads("enqueuedAtMs")) {
      let found = events.find((event) => event.payload.uuid === upload.uuid);
      if (!found) continue;
      let inFlight = this.eventUploader.inFlightBatch();
      let queuedBehind;
      if (opts.release === undefined && this.eventUploader.holdsOnArrival(found)) queuedBehind = "hold";
      else if (inFlight !== undefined)
        queuedBehind = inFlight.some((event) => !event.ephemeral) ? "durable_post" : "ephemeral_post";
      else if (this.eventUploader.backlog().backingOff) queuedBehind = "retry_backoff";
      else queuedBehind = "none";
      upload.timing.enqueuedAtMs = performance.now();
      upload.timing.queuedBehind = queuedBehind;
    }
    return this.eventUploader.enqueue(events, opts);
  }
  releaseClientEvents(release, releasedBy) {
    this.eventUploader.release(release, releasedBy);
  }
  offerToEventsPost(events, opts) {
    if (
      opts.rule !== "served_policy" ||
      opts.retryCount > 0 ||
      this.flushPolicy?.eventBatchUpload !== true ||
      this.ridesAreOff()
    )
      return;
    let { promise, resolve } = Promise.withResolvers();
    this.ridingRows = {
      rows: events,
      bytes: opts.bytes,
      settle: resolve,
    };
    queueMicrotask(() => {
      if (this.ridingRows?.rows === events && !this.liveViewLaneSendsMore()) this.giveBackRidingRows();
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
  noteRouteOnlyFailure(status) {
    this.routeOnlyFailures++;
    if (this.routeOnlyFailures < 2 && status !== 405 && status !== 501) return;
    let min = Math.min(RIDE_PAUSE_BASE_MS * 2 ** this.ridePauses, RIDE_PAUSE_MAX_MS);
    this.ridePauses++;
    this.ridesPausedUntilMs = performance.now() + min;
    logForDiagnosticsNoPII("warn", "cli_ccr_joint_upload_paused", {
      status,
      pause_ms: min,
    });
  }
  giveBackRidingRows() {
    this.ridingRows?.settle(false);
    this.ridingRows = undefined;
  }
  settlesTakenRiders(send) {
    let settle = () => {
      this.takenRiders?.settle(false);
      this.takenRiders = undefined;
    };
    return (events, opts) => {
      let promise = send(events, opts);
      promise.then(settle, settle);
      return promise;
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
  takeStreamEventBuffer(atTurnEnd = false) {
    if (!atTurnEnd) {
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
    let parkedRows = atTurnEnd ? [] : this.parkedRows;
    for (let { message } of parkedRows) release ??= this.releaseFor(message);
    if (this.streamEventBuffer.length === 0)
      return {
        events: atTurnEnd ? [] : this.takeParkedRows(),
        release,
      };
    let streamEvents = [];
    let lastCount;
    let delta = 0;
    for (let event of this.streamEventBuffer) {
      if (event.type === "stream_event") {
        streamEvents.push(event);
        continue;
      }
      delta =
        (lastCount !== undefined &&
        event.estimated_tokens - event.estimated_tokens_delta === lastCount.estimated_tokens
          ? delta
          : 0) + event.estimated_tokens_delta;
      lastCount = event;
    }
    this.streamEventBuffer = [];
    this.streamEventsTakenAt = Date.now();
    for (let upload of this.trackedFrameUploads("enqueuedAtMs"))
      upload.uuid = findCoalescedRunHead(streamEvents, upload.uuid);
    let mapped = coalesceStreamEvents(streamEvents)
      .filter((event) => {
        let size = Buffer.byteLength(jsonStringify(event));
        if (size <= MAX_FRAME_BYTES) return true;
        dropOversizeStreamEvent(event, size);
        return false;
      })
      .map((payload) => ({
        payload,
        ephemeral: true,
      }));
    if (lastCount)
      mapped.push(
        this.toClientEvent({
          ...lastCount,
          estimated_tokens_delta: delta,
        }),
      );
    if (!atTurnEnd) mapped.push(...this.takeParkedRows());
    return {
      events: mapped,
      release,
    };
  }
  currentUploadTrim() {
    let trim = this.uploadTrim();
    return isPlainObject(trim) ? trim : EMPTY_UPLOAD_TRIM;
  }
  async writeInternalEvent(kind, payload, { isCompaction = false, agentId, preservedEventIds } = {}) {
    let preservedIds = preservedEventIds;
    let trimmed = trimPreservedMessagesMetadata(payload);
    if (preservedIds && preservedIds.length > MAX_PRESERVED_MESSAGE_UUIDS) {
      logEvent("tengu_ccr_preserved_event_ids_clamped", {
        originalCount: preservedIds.length,
        cap: MAX_PRESERVED_MESSAGE_UUIDS,
        payloadClamped: trimmed !== null,
      });
      preservedIds = preservedIds.slice(-MAX_PRESERVED_MESSAGE_UUIDS);
    }
    let outPayload = trimmed ?? payload;
    if (this.currentUploadTrim().envelope === true) {
      let stripped = stripTranscriptOnlyFields(outPayload, this.keepsRequestId);
      if (stripped !== outPayload && !this.loggedTranscriptEnvelopeStrip) {
        this.loggedTranscriptEnvelopeStrip = true;
        logFeatureOk("ccr_worker_envelope_strip");
      }
      if (
        !this.loggedRequestIdKept &&
        isAssistantWithMessageId(stripped) &&
        typeof stripped.requestId === "string" &&
        this.keepsRequestId()
      ) {
        this.loggedRequestIdKept = true;
        logFeatureOk("ccr_worker_error_request_id_kept");
      }
      outPayload = stripped;
    }
    if (kind === "transcript" && outPayload.type === "user") {
      let result = this.uploadedToolResult(
        outPayload.toolUseResult,
        outPayload.message,
        outPayload.isVirtual === true,
      );
      if (result !== outPayload.toolUseResult)
        outPayload = {
          ...outPayload,
          toolUseResult: result,
        };
    }
    let event = {
      payload: {
        type: kind,
        ...outPayload,
        uuid: typeof outPayload.uuid === "string" ? outPayload.uuid : randomUUID(),
      },
      ...(isCompaction && {
        is_compaction: true,
      }),
      ...(agentId && {
        session_agent_id: agentId,
      }),
      ...(preservedIds?.length && {
        preserved_event_ids: preservedIds,
      }),
    };
    let events = [event];
    let agentKey = agentId || "";
    let awaiting = this.rowsAwaitingCompactSummary.get(agentKey);
    if (
      kind === "transcript" &&
      (awaiting !== undefined || (isCompaction && this.rowsAwaitingCompactSummaryAtClose === undefined))
    ) {
      if (awaiting === undefined) {
        awaiting = {
          rows: [],
          timer: this.startCompactSummaryWaitTimer(agentKey),
        };
        this.rowsAwaitingCompactSummary.set(agentKey, awaiting);
      }
      awaiting.rows.push(event);
      let reason =
        outPayload.isCompactSummary === true
          ? "summary"
          : outPayload.type === "user" || outPayload.type === "assistant"
            ? "user_or_assistant_row"
            : awaiting.rows.length >= MAX_VIEWER_ROWS_BEFORE_FLUSH
              ? "row_cap"
              : undefined;
      if (reason === undefined) return;
      events = this.takeRowsAwaitingCompactSummary(agentKey, reason);
    }
    let releases =
      kind === "transcript" && outPayload.type === "user" && this.toolResultReleases(outPayload.message);
    let ids =
      this.gatesToolCalls && kind === "transcript" && !agentId ? getMainThreadToolUseIds(outPayload) : [];
    await this.queueInternalEvents(
      events,
      releases
        ? "tool_result"
        : ids.some((id) => this.awaitedToolCalls.has(id))
          ? "tool_call"
          : !this.transcriptRowMayWait(kind, outPayload, agentId)
            ? "event"
            : undefined,
    );
    if (kind === "transcript") this.transcriptLaneInUse = true;
    this.noteToolCallRows("internal_events", ids, "queued");
  }
  async queueInternalEvents(events, release) {
    let compaction = events[0]?.is_compaction === true && this.holdRule !== undefined;
    if (compaction) this.releaseClientEvents("event", "compaction");
    let mapped = (
      events[0]?.is_compaction === true && events[0].session_agent_id === undefined
        ? (this.rowsRepeatedAfterCompaction?.() ?? [])
        : []
    ).map(({ eventType, payload }) => ({
      payload: {
        type: eventType,
        ...payload,
        uuid: randomUUID(),
      },
    }));
    let allEvents = [...events, ...mapped];
    this.markInternalEventPostWatch((watch) => watch.noteQueued(allEvents));
    await this.internalEventUploader.enqueue(allEvents, {
      together: true,
      release: compaction ? "event" : release,
    });
  }
  startCompactSummaryWaitTimer(agentKey) {
    let timer = setTimeout(
      (uploader, agentKey) => {
        let awaiting = uploader.rowsAwaitingCompactSummary.get(agentKey);
        if (uploader.closed || awaiting === undefined) return;
        if (!uploader.internalEventUploader.hasRoomFor(1)) {
          awaiting.timer = uploader.startCompactSummaryWaitTimer(agentKey);
          return;
        }
        uploader
          .queueInternalEvents(uploader.takeRowsAwaitingCompactSummary(agentKey, "timeout"), undefined)
          .catch(logError);
      },
      HELD_ROWS_MAX_AGE_MS,
      this,
      agentKey,
    );
    timer.unref?.();
    return timer;
  }
  takeRowsAwaitingCompactSummary(agentKey, reason) {
    let awaiting = this.rowsAwaitingCompactSummary.get(agentKey);
    this.rowsAwaitingCompactSummary.delete(agentKey);
    clearTimeout(awaiting?.timer);
    let rows = awaiting?.rows ?? [];
    if (reason !== "summary" && reason !== "close")
      logForDiagnosticsNoPII("info", "cli_worker_compaction_marker_uploaded_without_summary", {
        reason,
        count: rows.length,
        subagent: agentKey !== "",
      });
    return rows;
  }
  transcriptRowMayWait(kind, payload, agentId) {
    let flushPolicy = this.flushPolicy;
    if (this.holdRule !== "served_policy" || !flushPolicy) return true;
    let type = kind === "transcript" ? payload.type : kind;
    if (typeof type !== "string" || flushPolicy.mustFlushTypes.has(type)) return false;
    if (
      type === "attachment" &&
      !agentId &&
      isPlainObject(payload.attachment) &&
      payload.attachment.type === "prompt_snapshot"
    )
      return this.internalEventUploader.hasHeld(
        (held) =>
          held.session_agent_id === undefined &&
          (held.payload.type === "assistant" ||
            (held.payload.type === "user" &&
              (held.payload.toolUseResult !== undefined || hasToolResultContent(held.payload.message)))),
      );
    if (type === "user") {
      if (flushPolicy.holdAcrossModelCalls && this.turnHold === "open" && !agentId) return false;
      return (
        payload.toolUseResult !== undefined ||
        hasToolResultContent(payload.message) ||
        payload.isMeta === true ||
        payload.isVirtual === true ||
        payload.isCompactSummary === true
      );
    }
    return !(type === "assistant" && flushPolicy.flushOnAssistant);
  }
  flushInternalEvents(x) {
    return this.internalEventUploader.flush(x);
  }
  watchInternalEventPosts() {
    let stats = new UploadBacklogStats(this.internalEventUploader.backlog().unsent);
    this.internalEventPostWatch = stats;
    return (since) => {
      if (this.internalEventPostWatch === stats) this.internalEventPostWatch = undefined;
      return stats.seen(since);
    };
  }
  markInternalEventPostWatch(fn) {
    let internalEventPostWatch = this.internalEventPostWatch;
    if (internalEventPostWatch === undefined) return;
    try {
      fn(internalEventPostWatch);
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
    let client = this.eventUploader.backlog();
    let internal = this.internalEventUploader.backlog();
    let filtered = [client.inFlightMs, internal.inFlightMs].filter((ms) => ms !== undefined);
    return {
      unsentClientEvents: client.unsent,
      unsentInternalEvents: internal.unsent + this.countRowsAwaitingCompactSummary(),
      oldestInFlightMs: filtered.length ? Math.max(...filtered) : undefined,
      backingOff: client.backingOff || internal.backingOff,
    };
  }
  async postInternalEventsBatch(events, opts = {}) {
    let refusal = this.refuseInternalEventsCall(true);
    if (refusal) return refusal;
    let epochMismatchCount = this.epochMismatchCount;
    try {
      let result = await this.request(
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
          signal: opts.signal,
        },
      );
      if (result.ok) {
        let parsed = eventBatchResultSchema().safeParse(result.data);
        return {
          ok: true,
          results: parsed.success ? parsed.data.results : undefined,
        };
      }
      return this.internalEventsFailure(result, epochMismatchCount);
    } catch (error) {
      return this.internalEventsFailure(
        {
          reason: `fetch_failed:${mergeClients(error)}`,
        },
        epochMismatchCount,
      );
    }
  }
  async getInternalEventsPage(query, opts = {}) {
    let refusal = this.refuseInternalEventsCall(false);
    if (refusal) return refusal;
    let url = new URL(`${this.sessionBaseUrl}/worker/internal-events`);
    if (query.limit !== undefined) url.searchParams.set("limit", String(query.limit));
    if (query.agentId) url.searchParams.set("session_agent_id", query.agentId);
    if (query.subagents) url.searchParams.set("subagents", "true");
    if (query.cursor) url.searchParams.set("cursor", query.cursor);
    else if (query.afterEventId) url.searchParams.set("after_event_id", query.afterEventId);
    let epochMismatchCount = this.epochMismatchCount;
    let signal;
    try {
      let authHeaders = this.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0)
        return {
          ok: false,
          reason: "no_auth_headers",
        };
      signal = opts.signal
        ? createCombinedAbortSignal(opts.signal, {
            timeoutMs: 30000,
            refTimer: true,
          })
        : undefined;
      let response = await fetch(url, {
        headers: {
          ...authHeaders,
          "anthropic-version": "2023-06-01",
          "anthropic-client-platform": getClientPlatform(),
          "User-Agent": claudeCodeUserAgent(),
        },
        signal: signal?.signal ?? AbortSignal.timeout(30000),
        ...getProxyFetchOptions({
          url: url.toString(),
        }),
      });
      if (response.ok) {
        let body;
        try {
          body = await response.json();
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
        }
        let parsed = sessionEventsPageSchema().safeParse(body);
        if (!parsed.success) {
          logForDiagnosticsNoPII("warn", "cli_worker_internal_events_page_foreign");
          return {
            ok: false,
            status: response.status,
            reason: "foreign_body",
          };
        }
        let length = Number(response.headers.get("content-length") ?? Number.NaN);
        return {
          ok: true,
          data: parsed.data.data.map(normalizePayload),
          ...(parsed.data.next_cursor && {
            nextCursor: parsed.data.next_cursor,
          }),
          bytes: Number.isFinite(length) ? length : null,
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
          let retry = parseInt(response.headers.get("retry-after") ?? "", 10);
          if (!isNaN(retry) && retry >= 0) retryAfterMs = retry * 1000;
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
      signal?.cleanup();
    }
  }
  refuseInternalEventsCall(needsEpoch) {
    if (this.closed)
      return {
        ok: false,
        reason: "client_closed",
        ...(this.lastEpochMismatchCause && {
          conflict: this.lastEpochMismatchCause,
        }),
      };
    if (needsEpoch && this.workerEpoch <= 0)
      return {
        ok: false,
        reason: "not_initialized",
      };
    return;
  }
  internalEventsFailure(failure, epoch, { errorType, resourceType, closedConflict } = {}) {
    let conflict =
      closedConflict ??
      (this.epochMismatchCount > epoch
        ? this.lastEpochMismatchCause
        : failure.status === 409
          ? (this.lastEpochMismatchCause ?? "epoch_conflict")
          : undefined);
    let status = failure.status ?? (conflict && CONFLICT_REASON_IS_SUPERSEDED[conflict] ? 409 : undefined);
    return {
      ok: false,
      reason: status === 409 ? "http_409" : (failure.reason ?? "unknown"),
      ...(status !== undefined && {
        status,
      }),
      ...(failure.retryAfterMs !== undefined && {
        retryAfterMs: failure.retryAfterMs,
      }),
      ...(conflict && {
        conflict,
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
  refusedInternalEvents(events) {
    return events.filter((uuid) => this.refusedInternalEventUuids.has(uuid));
  }
  noteRefusedInternalEvents(events) {
    for (let { payload, session_agent_id: sessionAgentId } of events)
      if (sessionAgentId === undefined) this.refusedInternalEventUuids.add(payload.uuid);
    let excess = this.refusedInternalEventUuids.size - MAX_REFUSED_INTERNAL_EVENT_UUIDS;
    for (let refusedInternalEventUuid of this.refusedInternalEventUuids) {
      if (excess-- <= 0) break;
      this.refusedInternalEventUuids.delete(refusedInternalEventUuid);
    }
  }
  dropOrphanedHandedOffLines(events) {
    let dropped = 0;
    for (let index = 0; index < events.length;) {
      let event = events[index];
      let { payload } = event;
      if (
        event.session_agent_id === undefined &&
        (payload.handedOff === true ||
          (payload.type === "system" && payload.subtype === UPGRADE_RELAY_MARKER)) &&
        !(payload.type === "user" && !hasToolResultContent(payload.message)) &&
        typeof payload.parentUuid === "string" &&
        this.refusedInternalEventUuids.has(payload.parentUuid)
      ) {
        events.splice(index, 1);
        dropped++;
        this.noteRefusedInternalEvents([event]);
        continue;
      }
      index++;
    }
    return dropped;
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
  flushDeliveryAcks(x) {
    if (this.receiptsRide) return this.receiptsRide.promise.then(() => this.flushDeliveryAcks(x));
    this.sendWaitingReceipts();
    return this.deliveryUploader.flush(x);
  }
  async flush(x) {
    if (this.waitingAnswers.length > 0) await this.writeEvents([]);
    await this.flushStreamEventBuffer();
    return this.eventUploader.flush(x);
  }
  withdrawQueuedControlRequest(requestId) {
    let predicate = (event) =>
      !event.ephemeral && event.payload.type === "control_request" && event.payload.request_id === requestId;
    return this.eventUploader.withdraw(predicate);
  }
  droppedDurableEventBatches = 0;
  get droppedDurableBatches() {
    return this.droppedDurableEventBatches;
  }
  takeUndeliveredClientEvents() {
    return this.eventUploader.takeUndelivered().filter((event) => !event.ephemeral);
  }
  discardUndeliveredClientEvents() {
    let filtered = this.eventUploader.peekUndelivered().filter((event) => !event.ephemeral);
    this.eventUploader.discardUndelivered();
    return filtered;
  }
  adoptClientEvents(events) {
    if (events.length === 0) return;
    this.eventUploader.enqueue(events);
  }
  async flushWorkerState() {
    return this.workerState.flush();
  }
  droppedWorkerStatePatchCount = 0;
  droppedOwedMetadataPatchCount = 0;
  get droppedWorkerStatePatches() {
    return this.droppedWorkerStatePatchCount;
  }
  refusedSwitchedOffMcpServers = null;
  switchedOffMcpServersRefusedAlone = 0;
  requeueRefusedSwitchedOffMcpServersOnceIdle() {
    if (this.refusedSwitchedOffMcpServers === null || this.refusedSwitchedOffMcpServers.writesToWaitFor > 0)
      return;
    setImmediate(
      (client, marker) => {
        if (client.refusedSwitchedOffMcpServers !== marker || client.workerState.unsent || client.closed)
          return;
        client.refusedSwitchedOffMcpServers = null;
        client.workerState.requeueMetadata({
          internal_metadata: {
            [DISABLED_MCP_SERVERS]: marker.value,
          },
        });
      },
      this,
      this.refusedSwitchedOffMcpServers,
    );
  }
  async readInternalEvents(afterEventId, signal, pageOpts) {
    return CCRClient.readInternalEventsFrom(this.readSource, afterEventId, signal, pageOpts);
  }
  async readInternalEventsForCatchUp(signal, afterEventId, pageOpts) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      {
        limit: "1000",
        ...(afterEventId && {
          after_event_id: afterEventId,
        }),
      },
      "internal_events",
      {
        maxAttempts: WORKER_STATE_MAX_ATTEMPTS,
        signal,
      },
      pageOpts,
    );
  }
  static readInternalEventsFrom(source, afterEventId, signal, pageOpts) {
    return CCRClient.paginatedGet(
      source,
      "/worker/internal-events",
      {
        limit: "1000",
        ...(afterEventId && {
          after_event_id: afterEventId,
        }),
      },
      "internal_events",
      {
        signal,
      },
      pageOpts,
    );
  }
  async readSubagentInternalEvents() {
    return CCRClient.readSubagentInternalEventsFrom(this.readSource);
  }
  static readSubagentInternalEventsFrom(source) {
    return CCRClient.paginatedGet(
      source,
      "/worker/internal-events",
      {
        subagents: "true",
        limit: "1000",
      },
      "subagent_events",
    );
  }
  async readAgentInternalEvents(sessionAgentId, signal, pageOpts, afterUuid) {
    return CCRClient.paginatedGet(
      this.readSource,
      "/worker/internal-events",
      {
        session_agent_id: sessionAgentId,
        limit: "1000",
        ...(afterUuid && {
          after_event_id: afterUuid,
        }),
      },
      "agent_events",
      {
        maxAttempts: WORKER_STATE_MAX_ATTEMPTS,
        signal,
      },
      pageOpts,
      Boolean(afterUuid),
    );
  }
  async readAgentMetadataEvents(ids, signal) {
    let reason = isEssentialTrafficOnly() ? "essential-traffic-only" : this.providerWithheldReason();
    if (reason !== undefined) {
      logForDiagnosticsNoPII("info", "cli_worker_request_withheld", {
        method: "post",
        path: "/worker/agent-metadata-events/batch-get",
        reason,
      });
      return null;
    }
    let events = [];
    for (let sessionAgentIds of chunk_default(
      normalizeCaseForComparison_2(ids),
      INTERNAL_EVENT_UUID_BATCH_SIZE,
    )) {
      let authHeaders = this.readSource.getAuthHeaders();
      if (Object.keys(authHeaders).length === 0) return null;
      let result = await CCRClient.getWithRetry(
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
          readBody: async (response) => {
            let body;
            try {
              body = await response.json();
            } catch (error) {
              if (!(error instanceof SyntaxError)) throw error;
            }
            let parsed = agentMetadataEventsSchema().safeParse(body);
            if (!parsed.success) {
              logForDiagnosticsNoPII("warn", "cli_worker_agent_metadata_events_foreign");
              return null;
            }
            return parsed.data.data ?? [];
          },
        },
      );
      if (result === null) return null;
      events.push(...result);
    }
    return events;
  }
  static async paginatedGet(source, path, query, context, opts = {}, pageOpts, singlePage = false) {
    let authHeaders = source.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) return null;
    let pageOpts2 = singlePage
      ? {
          ...opts,
          maxAttempts: 1,
        }
      : opts;
    let events = [];
    let cursor;
    let pages = 0;
    let count = 0;
    let bytes = 0;
    let received = 0;
    let encoding = null;
    do {
      let url = new URL(`${source.sessionBaseUrl}${path}`);
      for (let [key, value] of Object.entries(query)) url.searchParams.set(key, value);
      if (cursor) {
        url.searchParams.set("cursor", cursor);
        url.searchParams.delete("after_event_id");
      }
      let anchored = !cursor && query.after_event_id !== undefined;
      let fallback;
      let page = await CCRClient.getWithRetry(
        source,
        url.toString(),
        authHeaders,
        context,
        (response) => {
          pages++;
          encoding ??= response.headers.get("content-encoding");
          let length = response.headers.get("content-length");
          if (length !== null && received !== null) received += Number(length);
          else received = null;
        },
        (status, reason) => {
          if (!anchored) return;
          if (status === 400) fallback = "rejected";
          else if (reason === "after_event_id_not_found") fallback = "not-found";
        },
        pageOpts === undefined
          ? pageOpts2
          : {
              ...pageOpts2,
              unencoded: !pageOpts.takesCompressedPages,
              readBody: async (response) => {
                let encoding = response.headers.get("content-encoding");
                if (!pageOpts.takesCompressedPages && encoding !== null && encoding !== "identity") {
                  await response.body?.cancel();
                  return {
                    encodedBody: true,
                  };
                }
                let bodyCapped = await readBodyCapped(response, pageOpts.maxBytes - bytes);
                if (bodyCapped === null)
                  return {
                    pastMaxBytes: true,
                  };
                let parsed = pageOpts.parsePage
                  ? await pageOpts.parsePage(bodyCapped.text)
                  : jsonParse(bodyCapped.text);
                if (
                  !isPlainObject(parsed) ||
                  !Array.isArray(parsed.data) ||
                  !parsed.data.every(isPlainObject)
                )
                  throw Error("CCRClient: a page is no list of events");
                bytes += bodyCapped.bytes;
                return parsed;
              },
            },
      );
      if (page?.encodedBody)
        return {
          events: [],
          stats: {
            pageCount: pages,
            bytesReceived: received,
            contentEncoding: encoding ?? "none",
          },
          encodedBody: true,
        };
      if (!page) {
        if (fallback) {
          logForDebugging(
            `CCRClient: after_event_id ${fallback === "rejected" ? "rejected by server (gate off)" : "not found (stale anchor)"} \u2014 refetching without anchor`,
            {
              level: "warn",
            },
          );
          logForDiagnosticsNoPII(
            "warn",
            fallback === "rejected"
              ? "cli_worker_after_event_id_rejected"
              : "cli_worker_after_event_id_not_found",
            {
              context,
            },
          );
          let { after_event_id: afterEventId, ...query2 } = query;
          let fallbackResult = await CCRClient.paginatedGet(source, path, query2, context, opts, pageOpts);
          if (!fallbackResult) return null;
          return {
            ...fallbackResult,
            anchorFallback: fallback,
          };
        }
        return null;
      }
      for (let event of page.data ?? [])
        if (!isClassifierDumpEvent(event.payload)) events.push(normalizePayload(event));
      count += Math.max(1, page.data?.length ?? 0);
      let event =
        pageOpts === undefined
          ? undefined
          : page.pastMaxBytes === true
            ? "bytes"
            : count > pageOpts.maxEvents
              ? "events"
              : (page.data ?? []).some((event) => !isTimestampWithinLimit(event, pageOpts.maxTimestampChars))
                ? "timestamp"
                : undefined;
      if ((singlePage && page.next_cursor) || event !== undefined) {
        if (event !== undefined) pageOpts?.onPassed?.(event);
        return {
          events: [],
          stats: {
            pageCount: pages,
            bytesReceived: received,
            contentEncoding: encoding ?? "none",
          },
          overBound: true,
          ...(event !== undefined && {
            overBoundBy: event,
          }),
        };
      }
      cursor = page.next_cursor;
    } while (cursor);
    logForDebugging(
      `CCRClient: Read ${events.length} internal events from ${path}${query.subagents ? " (subagents)" : ""}`,
    );
    return {
      events,
      stats: {
        pageCount: pages,
        bytesReceived: received,
        contentEncoding: encoding ?? "none",
        ...(pageOpts !== undefined && {
          bytesDecoded: bytes,
        }),
      },
    };
  }
  static getWithRetry(source, url, headers, context, onResponse, onPermanent, opts = {}) {
    return CCRClient.getWithRetryNow(source, url, headers, context, onResponse, onPermanent, opts);
  }
  static async getWithRetryNow(
    source,
    url,
    headers,
    context,
    onResponse,
    onPermanent,
    { maxAttempts = DEFAULT_MAX_ATTEMPTS, signal, readBody, unencoded, postJson, permanentStatuses },
  ) {
    let rangeRetries = 0;
    for (let j = 1; j <= maxAttempts; j++) {
      if (signal?.aborted) return null;
      let response;
      try {
        response = await proxyAwareFetch(
          url,
          {
            ...(postJson !== undefined && {
              method: "POST",
              body: postJson,
            }),
            headers: {
              ...headers,
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
              url,
            }),
          },
          source.ownConnectionPool,
          source.leavesPoolAfterServerError,
        );
        if (response.ok) {
          let body = readBody ? await readBody(response) : await response.json();
          onResponse?.(response);
          return body;
        }
      } catch (error) {
        if (signal?.aborted) return null;
        logForDebugging(
          `CCRClient: GET ${url} failed (attempt ${j}/${maxAttempts}): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (error instanceof RangeError && ++rangeRetries >= RETRY_COUNT_3) break;
        if (j < maxAttempts) {
          let delay = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
          await sleep(delay, signal);
        }
        continue;
      }
      let errorType;
      if (response.status === 404 && onPermanent)
        try {
          let body = await response.json();
          if (typeof body?.error?.type === "string") errorType = body.error.type;
        } catch {}
      else if (response.status === 409) {
        if (source.isClosed?.()) {
          await drainResponseBody(response);
          return null;
        }
        let conflictReason = await readConflictReason(response);
        if (source.isClosed?.()) return null;
        if (conflictReason === undefined && signal?.aborted) {
          logForDebugging(
            `CCRClient: GET ${url} returned 409 after its caller ended the read; its reason was not read, so the next request's 409 decides`,
            {
              level: "warn",
            },
          );
          return null;
        }
        source.onConflict?.(conflictReason);
        return null;
      } else await drainResponseBody(response);
      if (
        isClientErrorStatus(response.status) ||
        errorType === "after_event_id_not_found" ||
        permanentStatuses?.includes(response.status) === true
      ) {
        logForDebugging(`CCRClient: GET ${url} returned ${response.status} \u2014 permanent, not retrying`, {
          level: "warn",
        });
        onPermanent?.(response.status, errorType);
        return null;
      }
      logForDebugging(`CCRClient: GET ${url} returned ${response.status} (attempt ${j}/${maxAttempts})`, {
        level: "warn",
      });
      if (j < maxAttempts) {
        let delay = Math.min(500 * 2 ** (j - 1), 30000) + Math.random() * 500;
        await sleep(delay, signal);
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
  reportDelivery(eventId, status, messageUuid, flags) {
    if (
      messageUuid !== undefined &&
      this.flushPolicy?.holdAcrossModelCalls &&
      this.waitingAnswers.some(isTopLevelSystemInit)
    )
      this.sendWaitingAnswers();
    if (
      !this.housekeepingRequestIds.has(eventId) &&
      (status === "processing" || (status === "received" && !flags?.controlTraffic))
    ) {
      this.turnTookInput = true;
      this.liveOnlyRequestingRow = undefined;
    }
    if (status === "received") {
      this.lastInboundEventAtMs = Date.now();
      let controlTraffic =
        flags?.controlTraffic === true && this.flushPolicy?.controlTrafficKeepsHold === true;
      this.setHasSubscribers(undefined, controlTraffic ? "reset" : "watcher");
      if (this.holdsAcrossModelCalls() && !controlTraffic) {
        if (this.parkedRows.length > 0) this.flushStreamEventBuffer();
        this.internalEventUploader.release("event", "inbound_event");
        this.releaseClientEvents("event", "inbound_event");
      }
      if (messageUuid !== undefined) {
        this.holdsNoMoreThisTurn = true;
        this.inboundMessageUuids.add(messageUuid);
        let oldest = this.inboundMessageUuids.values().next().value;
        if (this.inboundMessageUuids.size > MAX_INBOUND_MESSAGE_UUIDS && oldest !== undefined)
          this.inboundMessageUuids.delete(oldest);
      }
    }
    let wasInbound = status !== "received" && this.inboundMessageUuids.delete(eventId);
    if (status === "processing") {
      if (this.closed) return;
      if (wasInbound && this.receiptsMayRide()) this.messagesInProcessing.add(eventId);
      let first = this.pendingProcessingAcks.push(eventId) === 1;
      if (this.pickupTakesTick) return;
      if (wasInbound && this.holdsAcrossModelCalls() && this.turnHold !== "open") {
        this.pickupTakesTick = true;
        this.endWholeTurnHold();
        this.ackPickupBehindWrittenRows().catch(logError);
      } else if (first)
        queueMicrotask(() => {
          if (!this.pickupTakesTick) this.sendProcessingAcks(this.pendingProcessingAcks);
        });
      return;
    }
    let waiting = this.waitingReceipts.has(eventId);
    let rides =
      status === "processed" &&
      this.messagesInProcessing.delete(eventId) &&
      !this.closed &&
      this.receiptsMayRide() &&
      normalizeUuidOrNull(eventId) !== null &&
      (this.resultPostWaits !== undefined || this.liveViewLaneSendsMore());
    if (this.messagesInProcessing.size === 0) this.resultPostWaits?.();
    let waitMs =
      (rides ||
        (status === "received" &&
          (flags?.settingsRequest ||
            (messageUuid !== undefined && this.flushPolicy?.messagesReceivedWaits)))) &&
      !this.closed &&
      this.followsServedPolicy
        ? (this.flushPolicy?.settingsReceiptsMaxWaitMs ?? 0)
        : 0;
    if (!waiting && waitMs <= 0) {
      this.queueDeliveryAcks([
        ...this.takeWaitingReceipts(isProcessedReceipt),
        {
          eventId,
          status,
        },
      ]);
      return;
    }
    if (!waiting || status === "processed") this.waitingReceipts.set(eventId, status);
    if (rides) this.receiptsRide ??= Promise.withResolvers();
    this.waitingReceiptsTimer ??= setTimeout(() => this.sendWaitingReceipts(), waitMs);
  }
  receiptsMayRide() {
    return (
      this.flushPolicy?.receiptsRideUploads === true &&
      this.flushPolicy.settingsReceiptsMaxWaitMs > 0 &&
      !this.receiptsRideRefused &&
      this.followsServedPolicy
    );
  }
  takeWaitingReceipts(filter = () => true) {
    let mapped = [...this.waitingReceipts]
      .filter(([eventId, status]) => filter(eventId, status))
      .map(([eventId, status]) => ({
        eventId,
        status,
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
  sendWaitingReceipts(filter) {
    this.queueDeliveryAcks(this.takeWaitingReceipts(filter));
  }
  queueDeliveryAcks(acks) {
    let noRoom = !this.deliveryUploader.hasRoomFor(acks.length);
    let promise = this.deliveryUploader.enqueue(acks);
    if (noRoom) {
      this.deliveryAcksWaitingForRoom.add(promise);
      promise.finally(() => this.deliveryAcksWaitingForRoom.delete(promise));
    }
  }
  async sendProcessingAcks(ids) {
    let ackIds = ids.splice(0);
    if (this.closed || ackIds.length === 0) return;
    let acks = this.takeWaitingReceipts(isProcessedReceipt);
    if (
      (
        await this.request(
          "post",
          "/worker/events/delivery",
          {
            worker_epoch: this.workerEpoch,
            updates: [
              ...ackIds.map((eventId) => ({
                event_id: eventId,
                status: "processing",
              })),
              ...acks.map((ack) => ({
                event_id: ack.eventId,
                status: ack.status,
              })),
            ],
          },
          "processing ack",
        )
      ).ok
    )
      this.takeWaitingReceipts((eventId, status) => status === "received" && ackIds.includes(eventId));
    else this.queueDeliveryAcks(acks);
  }
  async ackPickupBehindWrittenRows() {
    this.sendWaitingAnswers();
    let promise = this.pickupBarriers.at(-1)?.opened.promise;
    let state = {
      opened: Promise.withResolvers(),
      writes: [],
      eventIds: [],
    };
    this.pickupBarriers.push(state);
    let result;
    try {
      await Promise.resolve();
      state.eventIds = this.pendingProcessingAcks.splice(0);
      this.pickupTakesTick = false;
      await promise;
      if (this.pickupBarriers.includes(state))
        result = await withDeadline(this.storeWrittenRowsThenAck(state.eventIds), this.pickupWaitMs);
      else {
        result = true;
        await this.sendProcessingAcks(state.eventIds);
      }
    } finally {
      let index = this.pickupBarriers.indexOf(state);
      this.openPickupBarriers(index < 0 || result ? index + 1 : this.pickupBarriers.length);
    }
  }
  async storeWrittenRowsThenAck(ids) {
    this.internalEventUploader.release("event", "pickup");
    await this.flush();
    await this.sendProcessingAcks(ids);
    return true;
  }
  openPickupBarriers(count) {
    for (let pickupBarrier of this.pickupBarriers.splice(0, count)) {
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
    let count = 0;
    for (let awaiting of this.rowsAwaitingCompactSummary.values()) count += awaiting.rows.length;
    return count;
  }
  get awaitsCompactSummary() {
    return this.rowsAwaitingCompactSummary.has("");
  }
  hasInternalEventRoom(count) {
    return !this.awaitsCompactSummary && this.internalEventUploader.hasRoomFor(count);
  }
  close(opts) {
    this.closeExceptInternalEvents(opts);
    if (this.refusedSwitchedOffMcpServers !== null) {
      logForDiagnosticsNoPII("warn", "cli_worker_switched_off_mcp_servers_not_saved", {
        times_refused_alone: this.switchedOffMcpServersRefusedAlone,
        accepted_writes_until_due: this.refusedSwitchedOffMcpServers.writesToWaitFor,
      });
      this.refusedSwitchedOffMcpServers = null;
    }
    let count = this.countRowsAwaitingCompactSummary();
    for (let key of this.rowsAwaitingCompactSummary.keys()) this.takeRowsAwaitingCompactSummary(key, "close");
    this.rowsAwaitingCompactSummaryAtClose ??= count;
    this.logUndeliveredAtClose("internal_events", this.internalEventUploader.close() + count);
  }
  flushGoodbye() {
    return this.goodbyeFlushed;
  }
  closeExceptInternalEvents(opts) {
    this.sendWaitingAnswers();
    this.openPickupBarriers(this.pickupBarriers.length);
    let closed = this.closed;
    this.closed = true;
    this.giveBackRidingRows();
    this.workerSocket?.usePostFromNowOn();
    this.closeAbort.abort();
    this.closingForSuccessor = opts?.retainUndeliveredClientEvents === true;
    let parked = this.takeParkedRows();
    if (parked.length > 0) this.eventUploader.enqueue(parked);
    if (opts?.keepWaitingWorkerMetadata === true) this.workerState.closeToNewPatches();
    else this.workerState.close();
    if (!closed && opts?.goodbye !== false) this.sendGoodbye();
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
      for (let waiter of toolCallRowWaiter) waiter.reached();
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
    if (opts?.keepClientEvents !== true)
      this.logUndeliveredAtClose(
        "client_events",
        this.eventUploader.close({
          retainUndelivered: opts?.retainUndeliveredClientEvents === true,
        }),
      );
    this.deliveryUploader.close();
  }
  registerShutdownCleanup(
    deps = {
      registerCleanup,
      registerPreExitFlush,
    },
    delay = CCR_RETRY_DELAY_MS,
  ) {
    deps.registerCleanup(() => this.beginShutdown());
    deps.registerPreExitFlush(() => this.finishShutdown(delay));
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
  async finishShutdown(timeout = CCR_RETRY_DELAY_MS, deadline = 1 / 0) {
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
                    timeout - (performance.now() - this.shutdownBeganAtMs),
                    deadline - (performance.now() - startTime),
                  ),
                ),
              )
            : undefined,
        ]),
        timeout,
      );
    } finally {
      let refused = this.droppedOwedMetadataPatchCount > this.owedMetadataDropsAtShutdown;
      if (owesMetadata || this.workerState.hasCutKeptMetadata || refused)
        logForDiagnosticsNoPII("info", "cli_worker_metadata_at_shutdown", {
          outcome: this.workerState.owesMetadata
            ? "timed_out"
            : this.workerState.hasCutKeptMetadata
              ? "cut"
              : refused
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
//@ chunk-qyz2x025.js:141357-141369 layout
var CCR_RETRY_DELAY_MS = 3000;
//@ chunk-qyz2x025.js:141369-141527 layout
function blockedToNeedInput(metadata) {
  let postTurnSummary = metadata.post_turn_summary;
  if (!hasStatusCategory(postTurnSummary) || postTurnSummary.status_category !== "blocked") return metadata;
  return {
    ...metadata,
    post_turn_summary: {
      ...postTurnSummary,
      status_category: "need_input",
    },
  };
}
//@ chunk-qyz2x025.js:141527-141639 layout
function hasStatusCategory(postTurnSummary) {
  return (
    postTurnSummary !== null &&
    typeof postTurnSummary === "object" &&
    "status_category" in postTurnSummary &&
    typeof postTurnSummary.status_category === "string"
  );
}
//@ chunk-qyz2x025.js:141639-141842 layout
async function readConflictReason(response) {
  let reason = asConflictReason(response.headers.get("x-ccr-conflict-reason"));
  if (reason !== undefined) {
    await drainResponseBody(response);
    return reason;
  }
  try {
    let body = await response.json();
    return asConflictReason(body?.error?.reason ?? body?.reason) ?? asConflictReason(body?.error?.type);
  } catch {}
  return;
}
//@ chunk-qyz2x025.js:141842-141962 layout
function asConflictReason(value) {
  switch (value) {
    case "superseded_by_worker":
    case "epoch_stale":
    case "session_not_active":
      return value;
    default:
      return;
  }
}
//@ chunk-qyz2x025.js:141962-144370 layout
function parseHoldPolicy(raw) {
  let parsed = WorkerLimitsSchema().safeParse(raw);
  if (!parsed.success) return;
  let data = parsed.data;
  let acrossCalls = data.hold_across_model_calls === true;
  let maxAgeMs = clampNonNegativeInt(
    data.max_age_ms,
    acrossCalls ? MAX_HOLD_AGE_MS : DEFAULT_MAX_HOLD_AGE_MS,
  );
  let maxEvents =
    maxAgeMs > 0
      ? clampNonNegativeInt(
          data.max_events,
          acrossCalls ? DEFAULT_MAX_HOLD_EVENTS_ACROSS_CALLS : DEFAULT_MAX_HOLD_EVENTS,
        )
      : 0;
  let maxBytes = clampNonNegativeInt(data.max_bytes, DEFAULT_MAX_HOLD_BYTES);
  let transcriptMaxAge = acrossCalls
    ? 0
    : clampNonNegativeInt(data.transcript_max_age_ms, DEFAULT_TRANSCRIPT_MAX_AGE_MS);
  let transcriptMaxAgeMs = transcriptMaxAge > maxAgeMs ? transcriptMaxAge : 0;
  let turnMaxAgeMs = clampNonNegativeInt(data.no_turn_max_age_ms, maxAgeMs);
  let policyVersion = data.policy_version ?? undefined;
  return {
    maxEvents,
    maxAgeMs,
    maxBytes: maxBytes > 0 ? maxBytes : undefined,
    flushOnSamplingEnd: data.flush_on_sampling_end === true && !acrossCalls,
    flushOnAssistant: data.flush_on_assistant === true,
    eventBatchUpload: data.event_batch_upload === true,
    holdAcrossModelCalls: acrossCalls,
    holdAgain:
      acrossCalls && data.hold_again
        ? {
            softAgeMs: clampNonNegativeInt(data.hold_again.soft_age_ms, maxAgeMs),
            softEvents: clampNonNegativeInt(data.hold_again.soft_events, maxEvents),
            after: new Set((data.hold_again.after ?? []).slice(0, MAX_MUST_FLUSH_TYPES)),
            neverAfterTools: new Set(
              (data.hold_again.never_after_tools ?? []).slice(0, MAX_HOLD_AGAIN_TOOL_NAMES),
            ),
            toolsWhoseResultsWait: data.hold_again.tools_whose_results_wait
              ? new Set(data.hold_again.tools_whose_results_wait.slice(0, MAX_HOLD_AGAIN_TOOL_NAMES))
              : undefined,
            laterWorkerHoldsFirstTurn:
              data.hold_again.later_worker_holds_first_turn === true &&
              data.live_twin_types?.includes("system/status") === true,
          }
        : undefined,
    mayWaitTypes: new Set((data.may_wait_types ?? []).filter((type) => MAY_WAIT_EVENT_TYPES.has(type))),
    mayWaitTypesRefused: countWhere(data.may_wait_types ?? [], (type) => !MAY_WAIT_EVENT_TYPES.has(type)),
    settingsReceiptsMaxWaitMs: clampNonNegativeInt(
      data.settings_receipts_max_wait_ms,
      DEFAULT_SETTINGS_RECEIPTS_MAX_WAIT_MS,
    ),
    messagesReceivedWaits: data.messages_received_waits === true,
    receiptsRideUploads: data.receipts_ride_uploads === true,
    flushBeforeToolsWaitMs: clampNonNegativeInt(
      data.flush_before_tools_wait_ms,
      DEFAULT_FLUSH_BEFORE_TOOLS_WAIT_MS,
    ),
    flushAfterTools: FLUSH_AFTER_TOOLS_MODES.find((mode) => mode === data.flush_after_tools) ?? "none",
    flushAfterToolNames: new Set((data.flush_after_tool_names ?? []).slice(0, MAX_HOLD_AGAIN_TOOL_NAMES)),
    mustFlushTypes: new Set((data.must_flush_types ?? []).slice(0, MAX_MUST_FLUSH_TYPES)),
    liveTwinTypes: new Set(
      (data.live_twin_types ?? [])
        .filter((type) => !type.startsWith("control_"))
        .slice(0, MAX_LIVE_TWIN_TYPES),
    ),
    liveOnlyTypes: new Set((data.live_only_types ?? []).filter((type) => LIVE_ONLY_EVENT_TYPES.has(type))),
    transcriptMaxAgeMs,
    noTurnMaxAgeMs: turnMaxAgeMs < maxAgeMs ? turnMaxAgeMs : 0,
    mergeWorkerReports: data.merge_worker_reports === true,
    controlTrafficKeepsHold: acrossCalls && data.control_traffic_keeps_hold === true,
    emptyCheckpointKeepsHold: acrossCalls && data.empty_checkpoint_keeps_hold === true,
    firstTurnHoldsEachCall: acrossCalls && data.first_turn_holds_each_call === true,
    settingsAnswersMaxWaitMs: clampNonNegativeInt(
      data.settings_answers_max_wait_ms,
      DEFAULT_SETTINGS_ANSWER_WAIT_MS,
    ),
    initMaxWaitMs: clampNonNegativeInt(data.init_max_wait_ms, DEFAULT_SETTINGS_ANSWER_WAIT_MS),
    metadataWaitsForStatus: new Set(
      (data.metadata_waits_for_status ?? []).filter((key) => STATUS_METADATA_KEYS_ALL.has(key)),
    ),
    metadataNeverSent: new Set(
      (data.metadata_never_sent ?? []).filter((key) => STATUS_PAYLOAD_METADATA_KEYS.has(key)),
    ),
    metadataMaxWaitMs: clampNonNegativeInt(data.metadata_max_wait_ms, MAX_HOLD_AGE_MS),
    costReportMaxWaitMs: clampNonNegativeInt(data.cost_report_max_wait_ms, DEFAULT_COST_REPORT_MAX_WAIT_MS),
    policyVersion:
      policyVersion !== undefined && POLICY_VERSION_PATTERN.test(policyVersion) ? policyVersion : undefined,
  };
}
//@ chunk-qyz2x025.js:144370-144446 layout
function normalizePayload(event) {
  let payload = normalizeUserToolUseResult(event.payload);
  return payload === event.payload
    ? event
    : {
        ...event,
        payload,
      };
}
//@ chunk-qyz2x025.js:144446-144614 layout
function hasUserMessageUuids(message) {
  return (
    "user_message_uuids" in message &&
    Array.isArray(message.user_message_uuids) &&
    message.user_message_uuids.length > 0 &&
    message.user_message_uuids.every((userMessageUuid) => typeof userMessageUuid === "string")
  );
}
//@ chunk-qyz2x025.js:144614-144742 layout
function isTopLevelSystemInit(message) {
  return (
    message.type === "system" &&
    "subtype" in message &&
    message.subtype === "init" &&
    !("parent_tool_use_id" in message && message.parent_tool_use_id)
  );
}
//@ chunk-qyz2x025.js:144742-144810 placement
var SDK_ROW_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qyz2x025.js:144742", () => {
  SDK_ROW_TYPES = new Set(["assistant", "attachment", "result", "system", "user"]);
});
//@ chunk-qyz2x025.js:144810-144983 placement
function describeSingleRowForTelemetry(events) {
  let payload = events.length === 1 ? events[0].payload : undefined;
  return (
    payload && {
      row_type: SDK_ROW_TYPES.has(payload.type) ? payload.type : "other",
      row_has_tool_result: hasToolResultContent(payload.message),
      row_bytes: Buffer.byteLength(jsonStringify(payload)),
    }
  );
}
//@ chunk-qyz2x025.js:144983-145517 placement
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
    let suffix =
      rateLimitInfo.rateLimitGraceActive === true
        ? "_grace"
        : rateLimitInfo.overageInUse === true || rateLimitInfo.isUsingOverage === true
          ? "_overage"
          : "";
    return `${message.type}/${rateLimitInfo.status}${suffix}`;
  }
  return "subtype" in message && typeof message.subtype === "string"
    ? `${message.type}/${message.subtype}`
    : message.type;
}
//@ chunk-qyz2x025.js:145517-145627 placement
function hasToolResultContent(message) {
  let content = isPlainObject(message) ? message.content : undefined;
  return (
    Array.isArray(content) && content.some((block) => isPlainObject(block) && block.type === "tool_result")
  );
}
//@ chunk-qyz2x025.js:145627-145665 placement
var READ_NOTIFICATIONS_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qyz2x025.js:145627", () => {
  READ_NOTIFICATIONS_TOOL_NAMES = new Set(["ReadNotifications"]);
});
//@ chunk-qyz2x025.js:145665-145779 placement
function getMainThreadToolUseIds(message, filter) {
  return isPlainObject(message) && message.type === "assistant" && message.parent_tool_use_id == null
    ? collectContentBlockField(message.message, "tool_use", "id", filter)
    : [];
}
//@ chunk-qyz2x025.js:145779-146011 placement
function collectContentBlockField(message, blockType, field, names) {
  let content = isPlainObject(message) ? message.content : undefined;
  if (!Array.isArray(content)) return [];
  let blocks = [];
  for (let block of content)
    if (
      isPlainObject(block) &&
      block.type === blockType &&
      (names === undefined || (typeof block.name === "string" && names.has(block.name)))
    ) {
      let value = block[field];
      if (typeof value === "string") blocks.push(value);
    }
  return blocks;
}
//@ chunk-qyz2x025.js:146011-146121 placement (2.1.88 match: createChildAbortController, 0.878)
function createChildAbortController(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) resolve();
    else
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
  });
}
//@ chunk-qyz2x025.js:146121-146205 placement
function evictOldestIfFull(set) {
  if (set.size > MAX_EPHEMERAL_RECEIPT_IDS) {
    let oldest = set.keys().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
}
//@ chunk-qyz2x025.js:146205-146309 placement
function clampNonNegativeInt(value, max) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(0, Math.trunc(value)), max)
    : 0;
}
//@ chunk-qyz2x025.js:146309-148247 placement
function summarizeAssistantMessage(flushPolicy, other) {
  if (!flushPolicy || !other) return flushPolicy === other;
  return (
    flushPolicy.maxEvents === other.maxEvents &&
    flushPolicy.maxAgeMs === other.maxAgeMs &&
    flushPolicy.maxBytes === other.maxBytes &&
    flushPolicy.flushOnSamplingEnd === other.flushOnSamplingEnd &&
    flushPolicy.flushOnAssistant === other.flushOnAssistant &&
    flushPolicy.eventBatchUpload === other.eventBatchUpload &&
    flushPolicy.holdAcrossModelCalls === other.holdAcrossModelCalls &&
    flushPolicy.holdAgain?.softAgeMs === other.holdAgain?.softAgeMs &&
    flushPolicy.holdAgain?.softEvents === other.holdAgain?.softEvents &&
    setsEqual(flushPolicy.holdAgain?.after, other.holdAgain?.after) &&
    setsEqual(flushPolicy.holdAgain?.neverAfterTools, other.holdAgain?.neverAfterTools) &&
    setsEqual(flushPolicy.holdAgain?.toolsWhoseResultsWait, other.holdAgain?.toolsWhoseResultsWait) &&
    flushPolicy.holdAgain?.laterWorkerHoldsFirstTurn === other.holdAgain?.laterWorkerHoldsFirstTurn &&
    setsEqual(flushPolicy.mayWaitTypes, other.mayWaitTypes) &&
    setsEqual(flushPolicy.liveOnlyTypes, other.liveOnlyTypes) &&
    setsEqual(flushPolicy.flushAfterToolNames, other.flushAfterToolNames) &&
    flushPolicy.settingsReceiptsMaxWaitMs === other.settingsReceiptsMaxWaitMs &&
    flushPolicy.messagesReceivedWaits === other.messagesReceivedWaits &&
    flushPolicy.receiptsRideUploads === other.receiptsRideUploads &&
    flushPolicy.flushBeforeToolsWaitMs === other.flushBeforeToolsWaitMs &&
    flushPolicy.flushAfterTools === other.flushAfterTools &&
    flushPolicy.mergeWorkerReports === other.mergeWorkerReports &&
    flushPolicy.transcriptMaxAgeMs === other.transcriptMaxAgeMs &&
    flushPolicy.noTurnMaxAgeMs === other.noTurnMaxAgeMs &&
    flushPolicy.controlTrafficKeepsHold === other.controlTrafficKeepsHold &&
    flushPolicy.emptyCheckpointKeepsHold === other.emptyCheckpointKeepsHold &&
    flushPolicy.firstTurnHoldsEachCall === other.firstTurnHoldsEachCall &&
    flushPolicy.settingsAnswersMaxWaitMs === other.settingsAnswersMaxWaitMs &&
    flushPolicy.initMaxWaitMs === other.initMaxWaitMs &&
    flushPolicy.policyVersion === other.policyVersion &&
    flushPolicy.mustFlushTypes.size === other.mustFlushTypes.size &&
    [...flushPolicy.mustFlushTypes].every((mustFlushType) => other.mustFlushTypes.has(mustFlushType)) &&
    flushPolicy.liveTwinTypes.size === other.liveTwinTypes.size &&
    [...flushPolicy.liveTwinTypes].every((liveTwinType) => other.liveTwinTypes.has(liveTwinType)) &&
    flushPolicy.metadataMaxWaitMs === other.metadataMaxWaitMs &&
    flushPolicy.costReportMaxWaitMs === other.costReportMaxWaitMs &&
    flushPolicy.metadataWaitsForStatus.size === other.metadataWaitsForStatus.size &&
    [...flushPolicy.metadataWaitsForStatus].every((type) => other.metadataWaitsForStatus.has(type)) &&
    setsEqual(flushPolicy.metadataNeverSent, other.metadataNeverSent)
  );
}
//@ chunk-qyz2x025.js:148247-148488 placement
function parseFlushIntervalMs(field, value, fallback) {
  let numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric === "number" && Number.isFinite(numeric)) return Math.min(Math.max(numeric, 0), 60000);
  if (value !== undefined)
    logForDebugging(`CCRClient: non-finite ${field} (${typeof value}) \u2014 using ${fallback}ms`, {
      level: "warn",
    });
  return fallback;
}
//@ chunk-qyz2x025.js:148488-148550 layout
function clampToolInputFlushMs(value) {
  return Math.min(parseFlushIntervalMs("toolInputFlushMs", value, 0), MAX_TOOL_INPUT_FLUSH_MS);
}
//@ chunk-qyz2x025.js:148550-148636 placement
function isThinkingTokensSystemMessage(message) {
  return message.type === "system" && "subtype" in message && message.subtype === "thinking_tokens";
}
//@ chunk-qyz2x025.js:148636-148999 placement
/**
 * 判断一条 SDK 消息是否属于实时/进度类（user、stream_event、tool_progress、不含 SendUserMessage/PushNotification 的 assistant、thinking_tokens/task_progress/hook_progress 系统消息），决定 CCRClient 的保留与刷写策略。
 */
function isEphemeralStreamMessage(message) {
  switch (message.type) {
    case "user":
    case "stream_event":
    case "tool_progress":
      return true;
    case "assistant":
      return !message.message.content.some(
        (block) =>
          block.type === "tool_use" &&
          (block.name === "SendUserMessage" || block.name === "PushNotification"),
      );
    case "system":
      return (
        "subtype" in message &&
        (message.subtype === "thinking_tokens" ||
          message.subtype === "task_progress" ||
          message.subtype === "hook_progress")
      );
    default:
      return false;
  }
}
//@ chunk-qyz2x025.js:148999-149057 placement
function hearthQuerySuffix(include) {
  if (include) return "?include_hearth=true";
  return "";
}
//@ chunk-qyz2x025.js:149057-149089 placement
function isHearthRequest(response) {
  return response?.hearth;
}
//@ chunk-qyz2x025.js:149089-149154 placement
function isHistoricalPayloadSeen(event, uuids) {
  return event.historical === true && uuids.has(event.payload.uuid);
}
//@ chunk-qyz2x025.js:149154-149200 placement
function isUserPayload(event) {
  return event.payload.type === "user";
}
//@ chunk-qyz2x025.js:149200-149462 placement
/**
 * 创建空闲跟踪器：noteActivity 记录活动并通知订阅者，sampleIdleSeconds 在回合运行时返回 0，否则返回距上次活动的秒数；用于 CCR 心跳的 idle 上报。
 */
function createIdleTracker(options) {
  let isTurnRunning = options?.isTurnRunning ?? (() => getMainLoopRefcount() > 0);
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
      if (isTurnRunning()) {
        now = now_2;
        return 0;
      }
      return Math.max(0, Math.floor((now_2 - now) / 1000));
    },
    onActivity: signal.subscribe,
  };
}
export {
  REQUEST_FOLLOWS_INIT,
  TENGU_PATIENT_LEDGER,
  findLastRowBeforeSpans,
  selectRowsToResend,
  MAX_ROW_AGE_MS,
  CCRInitError,
  isWorkerRegisterFailure,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  WORKER_CONFLICT_CLOSE_CODES,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  DEFAULT_HELD_BUNCH_FLUSH_MS,
  CCRClient,
  workerEpochFromEnv,
  createIdleTracker,
  isEphemeralStreamMessage,
  MAX_PRESERVED_MESSAGE_UUIDS,
  SETTINGS_CONTROL_SUBTYPES,
  scopeKey,
  isUserPayload,
};
