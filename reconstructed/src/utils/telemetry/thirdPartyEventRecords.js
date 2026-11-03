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
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { MAX_DIAGNOSTIC_ERRORS } from "../../bootstrap/sessionSlices.js";
import { withDeadline } from "../sleep.js";
import { HostScoped } from "../hostScoped.js";
import { touchSetEntry } from "./accountMemoryRedaction.js";
import { evictOldestIfAtCap } from "../imageStore.js";
import { getEventLogger, getRootSession, bufferPendingOTelEvent } from "../../bootstrap/state.js";
import { otelEventStateByHost, logOTelEvent } from "./events.js";
import { isEnvTruthy } from "../envUtils.js";

//@ chunk-p52gp8zk.js:6901-7015 placement
var isPrimitiveAttribute = (e) =>
  ["string", "number", "boolean"].includes(typeof e) ||
  (Array.isArray(e) && e.every((n) => typeof n === "string"));
//@ chunk-p52gp8zk.js:7015-7316 placement
function buildEventRecord({ event, attributes, loggedAt, eventContext }) {
  let spanContext = otelApi_3.trace.getSpanContext(eventContext ?? otelApi_3.context.active());
  let c = spanContext !== undefined && otelApi_3.isSpanContextValid(spanContext);
  return {
    to: "collector",
    event,
    attributes: pickByHelper(attributes, isPrimitiveAttribute),
    loggedAt: loggedAt.toISOString(),
    ...(c && {
      span: {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      },
    }),
  };
}
//@ chunk-p52gp8zk.js:7316-7663 placement
function sendEventRecord(e, { entry, signal, hookOrigin }) {
  let s = () =>
    logForDebugging(
      `[3P telemetry] Event record dropped (${entry.event}): still on the collector road when a flush stopped waiting`,
    );
  let c = (error) =>
    logForDebugging(
      `[3P telemetry] Event record lost (${entry.event}): its raise failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  return signal.aborted
    ? s()
    : e.send(entry, signal, hookOrigin).then(
        () => {
          return;
        },
        (error) => (signal.aborted ? s() : c(error)),
      );
}
//@ chunk-p52gp8zk.js:7663-8568 placement
/**
 * 创建第三方遥测事件记录的发送队列：顺序发送、可中止、限制积压。
 */
function createEventRecordQueue() {
  let e = pu();
  let deferred = Promise.withResolvers();
  let o = null;
  let abortController = new AbortController();
  let s = 0;
  async function c() {
    while (o !== null) await o;
  }
  function u() {
    if (o === null) return;
    logForDebugging(
      "[3P telemetry] A flush stopped waiting for the collector road; records still on it are dropped",
    );
    abortController.abort();
    abortController = new AbortController();
    o = null;
  }
  return {
    setRoad: (f) => {
      e.set(f);
      if (f === null) deferred = Promise.withResolvers();
      else {
        s = 0;
        deferred.resolve(f);
      }
    },
    getRoad: e.get,
    route: (f, hookOrigin) => {
      let y = e.get() === null;
      if (y && s >= MAX_DIAGNOSTIC_ERRORS) {
        logForDebugging(
          "[3P telemetry] Event record dropped: no road installed and too many already waiting for one",
          {
            level: "warn",
          },
        );
        return Promise.resolve();
      }
      s += y ? 1 : 0;
      let m = {
        entry: f(),
        signal: abortController.signal,
        hookOrigin,
      };
      let E = (o ?? Promise.resolve())
        .then(() => e.get() ?? deferred.promise)
        .then((g) => sendEventRecord(g, m))
        .catch((error) =>
          logForDebugging(`[3P telemetry] Event record dropped: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      o = E;
      E.then(() => {
        if (o === E) o = null;
      });
      return E;
    },
    isIdle: () => o === null,
    settled: c,
    settledWithin: (f) => withDeadline(c(), f).then(u),
  };
}
//@ chunk-p52gp8zk.js:8568-8581 placement
var eventRecordQueue = createEventRecordQueue();
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
var contentLoggingStateByHost = new HostScoped(() => new ContentLoggingState());
//@ chunk-p52gp8zk.js:8764-8819 placement
function markRecordDropped(host) {
  let n = contentLoggingStateByHost.of(host);
  n.dropped = true;
  n.version++;
}
//@ chunk-p52gp8zk.js:8819-8854 placement
function markRecordGenuine(host) {
  contentLoggingStateByHost.of(host).genuine = true;
}
//@ chunk-p52gp8zk.js:8854-8987 placement
function noteShownText(e, n) {
  let o = contentLoggingStateByHost.of(e);
  if (n.trim() === "" || !touchSetEntry(o.shown, n)) return;
  o.shownChars = evictOldestIfAtCap(o, o.shown, o.shownChars + n.length);
  o.version++;
}
//@ chunk-p52gp8zk.js:8987-9134 placement
function noteToolText(host, n) {
  let o = contentLoggingStateByHost.of(host);
  if (n.trim() === "" || !touchSetEntry(o.toolTexts, n)) return;
  o.toolTextChars = evictOldestIfAtCap(o, o.toolTexts, o.toolTextChars + n.length);
  o.version++;
}
//@ chunk-p52gp8zk.js:9134-9251 placement
function hasRecordedText(e) {
  if (e === undefined) return true;
  let n = contentLoggingStateByHost.of(e);
  return n.shown.size > 0 || n.toolTexts.size > 0 || n.genuine || n.dropped;
}
//@ chunk-p52gp8zk.js:9251-9282 placement
function recordStateOf(e) {
  return contentLoggingStateByHost.of(e);
}
//@ chunk-p52gp8zk.js:16085-16202 placement
function otelLogRecord(event, attributes, o, r) {
  return {
    timestamp: o,
    observedTimestamp: o,
    body: `claude_code.${event}`,
    attributes,
    ...(r && {
      context: r,
    }),
  };
}
//@ chunk-p52gp8zk.js:16202-16475 placement
function emitOrBufferOtelEvent(otelLogRecord, event) {
  let eventLogger = getEventLogger();
  if (eventLogger) {
    eventLogger.emit(otelLogRecord);
    return;
  }
  let r = otelEventStateByHost.of(getRootSession().host);
  if (!bufferPendingOTelEvent(otelLogRecord) && !r.warnedNoEventLogger) {
    r.warnedNoEventLogger = true;
    logForDebugging(`[3P telemetry] Event dropped (no event logger initialized): ${event}`, {
      level: isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ? "warn" : "debug",
    });
  }
}
//@ chunk-p52gp8zk.js:16475-16615 placement
function logPermissionModeChanged(e, agentContext) {
  if (e.from === e.to) return;
  logOTelEvent(
    "permission_mode_changed",
    {
      from_mode: e.from,
      to_mode: e.to,
      ...(e.trigger && {
        trigger: e.trigger,
      }),
    },
    agentContext,
  );
}
//@ chunk-p52gp8zk.js:16615-16949 placement
function logCompactionEvent(e, agentContext) {
  logOTelEvent(
    "compaction",
    {
      trigger: e.trigger,
      success: String(e.success),
      duration_ms: String(Math.round(e.durationMs)),
      ...(e.preTokens !== undefined && {
        pre_tokens: String(e.preTokens),
      }),
      ...(e.postTokens !== undefined && {
        post_tokens: String(e.postTokens),
      }),
      ...(e.error && {
        error: e.error,
      }),
      ...(e.precomputeReuse && {
        precompute_reuse: e.precomputeReuse,
      }),
    },
    agentContext,
  );
}
//@ chunk-p52gp8zk.js:16949-17796 placement
function logRetentionSweep(e) {
  logOTelEvent("retention_sweep", {
    result: e.result,
    period_days: String(e.periodDays),
    used_default: String(e.usedDefault),
    ...(e.skipReason && {
      skip_reason: e.skipReason,
    }),
    ...(e.transcriptsDeleted !== undefined && {
      transcripts_deleted: String(e.transcriptsDeleted),
    }),
    ...(e.transcriptsExemptedDesktop !== undefined && {
      transcripts_exempted_desktop: String(e.transcriptsExemptedDesktop),
    }),
    ...(e.sessionFilesDeleted !== undefined && {
      session_files_deleted: String(e.sessionFilesDeleted),
    }),
    ...(e.artifactsDeleted !== undefined && {
      artifacts_deleted: String(e.artifactsDeleted),
    }),
    ...(e.filesRetainedFresh !== undefined && {
      files_retained_fresh: String(e.filesRetainedFresh),
    }),
    ...(e.filesPastCutoff !== undefined && {
      files_past_cutoff: String(e.filesPastCutoff),
    }),
    ...(e.errorCount !== undefined && {
      error_count: String(e.errorCount),
    }),
    ...(e.historyEntriesPruned !== undefined && {
      history_entries_pruned: String(e.historyEntriesPruned),
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
    let n = error.name !== "Error" ? error.name : error.constructor?.name || "Error";
    logOTelEvent("internal_error", {
      error_name: sanitizeClassName(n) ?? "Error",
      error_code: sanitizeErrnoForTelemetry(error),
    });
  } finally {
    firstInternalErrorLogged = false;
  }
}
//@ chunk-p52gp8zk.js:17981-18069 placement
function logAtMention(e) {
  logOTelEvent("at_mention", {
    mention_type: e.mentionType,
    success: String(e.success),
  });
}
//@ chunk-p52gp8zk.js:18069-18288 placement
function logAuthEvent(e) {
  let n = e.error !== undefined ? classifyAxiosError(e.error) : null;
  logOTelEvent("auth", {
    action: e.action,
    success: String(e.success),
    auth_method: e.authMethod,
    ...(n && {
      error_category: n.kind,
      ...(n.status !== undefined && {
        status_code: String(n.status),
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
