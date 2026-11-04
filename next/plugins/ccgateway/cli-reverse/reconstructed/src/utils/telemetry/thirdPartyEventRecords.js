/**
 * utils/telemetry/thirdPartyEventRecords.ts
 *
 * 2.1.316 新增：第三方遥测事件记录与 OTel 事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (23)
 * attribution: placement 23
 */
import { otelApi_3 } from "./repositoryAttributes.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, sanitizeClassName, sanitizeErrnoForTelemetry, classifyAxiosError } from "../errors.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { MAX_DIAGNOSTIC_ERRORS } from "../../bootstrap/sessionSlices.js";
import { withDeadline } from "../sleep.js";
import { HostScoped } from "../hostScoped.js";
import { touchSetEntry } from "./accountMemoryRedaction.js";
import { evictOldestIfAtCap } from "../imageStore.js";
import { getEventLogger, getRootSession, bufferPendingOTelEvent } from "../../bootstrap/state.js";
import { otelEventStateByHost, logOTelEvent } from "./events.js";
import { isEnvTruthy } from "../envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p52gp8zk.js:6901-7015 placement
var isPrimitiveAttribute = (value) =>
  ["string", "number", "boolean"].includes(typeof value) ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));
//@ chunk-p52gp8zk.js:7015-7316 placement
function buildEventRecord({ event, attributes, loggedAt, eventContext }) {
  let spanContext = otelApi_3.trace.getSpanContext(eventContext ?? otelApi_3.context.active());
  let hasValidSpan = spanContext !== undefined && otelApi_3.isSpanContextValid(spanContext);
  return {
    to: "collector",
    event,
    attributes: pickByHelper(attributes, isPrimitiveAttribute),
    loggedAt: loggedAt.toISOString(),
    ...(hasValidSpan && {
      span: {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      },
    }),
  };
}
//@ chunk-p52gp8zk.js:7316-7663 placement
function sendEventRecord(road, { entry, signal, hookOrigin }) {
  let onDropped = () =>
    logForDebugging(
      `[3P telemetry] Event record dropped (${entry.event}): still on the collector road when a flush stopped waiting`,
    );
  let onLost = (error) =>
    logForDebugging(
      `[3P telemetry] Event record lost (${entry.event}): its raise failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  return signal.aborted
    ? onDropped()
    : road.send(entry, signal, hookOrigin).then(
        () => {
          return;
        },
        (error) => (signal.aborted ? onDropped() : onLost(error)),
      );
}
//@ chunk-p52gp8zk.js:7663-8568 placement
/**
 * 创建第三方遥测事件记录的发送队列：顺序发送、可中止、限制积压。
 */
function createEventRecordQueue() {
  let road = subscribe();
  let deferred = Promise.withResolvers();
  let pending = null;
  let abortController = new AbortController();
  let waiters = 0;
  async function waitForRoad() {
    while (pending !== null) await pending;
  }
  function dropRoad() {
    if (pending === null) return;
    logForDebugging(
      "[3P telemetry] A flush stopped waiting for the collector road; records still on it are dropped",
    );
    abortController.abort();
    abortController = new AbortController();
    pending = null;
  }
  return {
    setRoad: (setRoad) => {
      road.set(setRoad);
      if (setRoad === null) deferred = Promise.withResolvers();
      else {
        waiters = 0;
        deferred.resolve(setRoad);
      }
    },
    getRoad: road.get,
    route: (road_2, hookOrigin) => {
      let waiters_2 = road.get() === null;
      if (waiters_2 && waiters >= MAX_DIAGNOSTIC_ERRORS) {
        logForDebugging(
          "[3P telemetry] Event record dropped: no road installed and too many already waiting for one",
          {
            level: "warn",
          },
        );
        return Promise.resolve();
      }
      waiters += waiters_2 ? 1 : 0;
      let flush = {
        entry: road_2(),
        signal: abortController.signal,
        hookOrigin,
      };
      let roadState = (pending ?? Promise.resolve())
        .then(() => road.get() ?? deferred.promise)
        .then((listener) => sendEventRecord(listener, flush))
        .catch((error) =>
          logForDebugging(`[3P telemetry] Event record dropped: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      pending = roadState;
      roadState.then(() => {
        if (pending === roadState) pending = null;
      });
      return roadState;
    },
    isIdle: () => pending === null,
    settled: waitForRoad,
    settledWithin: (args) => withDeadline(waitForRoad(), args).then(dropRoad),
  };
}
//@ chunk-p52gp8zk.js:8568-8581 placement
var eventRecordQueue; // deferred: uses createEventRecordQueue of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p52gp8zk.js:8568", () => {
  eventRecordQueue = createEventRecordQueue();
});
//@ chunk-p52gp8zk.js:8618-8638 placement
var EVENT_RECORD_LIMITS = 8388608;
var MAX_EVENT_RECORD_POOL = 24;
//@ chunk-p52gp8zk.js:8638-8740 placement
class ContentLoggingState {
  shown = new Set();
  toolTexts = new Set();
  shownChars = 0;
  toolTextChars = 0;
  dropped = false;
  genuine = false;
  version = 0;
}
//@ chunk-p52gp8zk.js:8740-8764 placement
var contentLoggingStateByHost; // deferred: uses ContentLoggingState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p52gp8zk.js:8740", () => {
  contentLoggingStateByHost = new HostScoped(() => new ContentLoggingState());
});
//@ chunk-p52gp8zk.js:8764-8819 placement
function markRecordDropped(host) {
  let state = contentLoggingStateByHost.of(host);
  state.dropped = true;
  state.version++;
}
//@ chunk-p52gp8zk.js:8819-8854 placement
function markRecordGenuine(host) {
  contentLoggingStateByHost.of(host).genuine = true;
}
//@ chunk-p52gp8zk.js:8854-8987 placement
function noteShownText(host, text) {
  let state = contentLoggingStateByHost.of(host);
  if (text.trim() === "" || !touchSetEntry(state.shown, text)) return;
  state.shownChars = evictOldestIfAtCap(state, state.shown, state.shownChars + text.length);
  state.version++;
}
//@ chunk-p52gp8zk.js:8987-9134 placement
function noteToolText(host, text) {
  let state = contentLoggingStateByHost.of(host);
  if (text.trim() === "" || !touchSetEntry(state.toolTexts, text)) return;
  state.toolTextChars = evictOldestIfAtCap(state, state.toolTexts, state.toolTextChars + text.length);
  state.version++;
}
//@ chunk-p52gp8zk.js:9134-9251 placement
function hasRecordedText(host) {
  if (host === undefined) return true;
  let state = contentLoggingStateByHost.of(host);
  return state.shown.size > 0 || state.toolTexts.size > 0 || state.genuine || state.dropped;
}
//@ chunk-p52gp8zk.js:9251-9282 placement
function recordStateOf(host) {
  return contentLoggingStateByHost.of(host);
}
//@ chunk-p52gp8zk.js:16085-16202 placement
function otelLogRecord(event, attributes, timestamp, context) {
  return {
    timestamp,
    observedTimestamp: timestamp,
    body: `claude_code.${event}`,
    attributes,
    ...(context && {
      context,
    }),
  };
}
//@ chunk-p52gp8zk.js:16202-16475 placement
function emitOrBufferOtelEvent(event, event_2) {
  let eventLogger = getEventLogger();
  if (eventLogger) {
    eventLogger.emit(event);
    return;
  }
  let state = otelEventStateByHost.of(getRootSession().host);
  if (!bufferPendingOTelEvent(event) && !state.warnedNoEventLogger) {
    state.warnedNoEventLogger = true;
    logForDebugging(`[3P telemetry] Event dropped (no event logger initialized): ${event_2}`, {
      level: isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ? "warn" : "debug",
    });
  }
}
//@ chunk-p52gp8zk.js:16475-16615 placement
function logPermissionModeChanged(change, agentContext) {
  if (change.from === change.to) return;
  logOTelEvent(
    "permission_mode_changed",
    {
      from_mode: change.from,
      to_mode: change.to,
      ...(change.trigger && {
        trigger: change.trigger,
      }),
    },
    agentContext,
  );
}
//@ chunk-p52gp8zk.js:16615-16949 placement
function logCompactionEvent(event, agentContext) {
  logOTelEvent(
    "compaction",
    {
      trigger: event.trigger,
      success: String(event.success),
      duration_ms: String(Math.round(event.durationMs)),
      ...(event.preTokens !== undefined && {
        pre_tokens: String(event.preTokens),
      }),
      ...(event.postTokens !== undefined && {
        post_tokens: String(event.postTokens),
      }),
      ...(event.error && {
        error: event.error,
      }),
      ...(event.precomputeReuse && {
        precompute_reuse: event.precomputeReuse,
      }),
    },
    agentContext,
  );
}
//@ chunk-p52gp8zk.js:16949-17796 placement
function logRetentionSweep(sweep) {
  logOTelEvent("retention_sweep", {
    result: sweep.result,
    period_days: String(sweep.periodDays),
    used_default: String(sweep.usedDefault),
    ...(sweep.skipReason && {
      skip_reason: sweep.skipReason,
    }),
    ...(sweep.transcriptsDeleted !== undefined && {
      transcripts_deleted: String(sweep.transcriptsDeleted),
    }),
    ...(sweep.transcriptsExemptedDesktop !== undefined && {
      transcripts_exempted_desktop: String(sweep.transcriptsExemptedDesktop),
    }),
    ...(sweep.sessionFilesDeleted !== undefined && {
      session_files_deleted: String(sweep.sessionFilesDeleted),
    }),
    ...(sweep.artifactsDeleted !== undefined && {
      artifacts_deleted: String(sweep.artifactsDeleted),
    }),
    ...(sweep.filesRetainedFresh !== undefined && {
      files_retained_fresh: String(sweep.filesRetainedFresh),
    }),
    ...(sweep.filesPastCutoff !== undefined && {
      files_past_cutoff: String(sweep.filesPastCutoff),
    }),
    ...(sweep.errorCount !== undefined && {
      error_count: String(sweep.errorCount),
    }),
    ...(sweep.historyEntriesPruned !== undefined && {
      history_entries_pruned: String(sweep.historyEntriesPruned),
    }),
  });
}
//@ chunk-p52gp8zk.js:17796-17805 placement
var firstInternalErrorLogged = false;
//@ chunk-p52gp8zk.js:17805-17981 placement
function logFirstInternalError(error) {
  if (firstInternalErrorLogged) return;
  firstInternalErrorLogged = true;
  try {
    let errorName = error.name !== "Error" ? error.name : error.constructor?.name || "Error";
    logOTelEvent("internal_error", {
      error_name: sanitizeClassName(errorName) ?? "Error",
      error_code: sanitizeErrnoForTelemetry(error),
    });
  } finally {
    firstInternalErrorLogged = false;
  }
}
//@ chunk-p52gp8zk.js:17981-18069 placement
function logAtMention(event) {
  logOTelEvent("at_mention", {
    mention_type: event.mentionType,
    success: String(event.success),
  });
}
//@ chunk-p52gp8zk.js:18069-18288 placement
function logAuthEvent(event) {
  let errorInfo = event.error !== undefined ? classifyAxiosError(event.error) : null;
  logOTelEvent("auth", {
    action: event.action,
    success: String(event.success),
    auth_method: event.authMethod,
    ...(errorInfo && {
      error_category: errorInfo.kind,
      ...(errorInfo.status !== undefined && {
        status_code: String(errorInfo.status),
      }),
    }),
  });
}
export {
  recordStateOf,
  EVENT_RECORD_LIMITS,
  logPermissionModeChanged,
  logRetentionSweep,
  logFirstInternalError,
  logAuthEvent,
  eventRecordQueue,
  buildEventRecord,
  logCompactionEvent,
  logAtMention,
  markRecordGenuine,
  noteToolText,
  markRecordDropped,
  otelLogRecord,
  emitOrBufferOtelEvent,
  MAX_EVENT_RECORD_POOL,
  noteShownText,
  hasRecordedText,
};
