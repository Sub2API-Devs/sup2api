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
import { A } from "./repositoryAttributes.js";
import { Do } from "../git/gitSafeEnv.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, sanitizeClassName, sanitizeErrnoForTelemetry, classifyAxiosError } from "../errors.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { sLi } from "../../bootstrap/sessionSlices.js";
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
function buildEventRecord({
  event: event,
  attributes: attributes,
  loggedAt: loggedAt,
  eventContext: eventContext,
}) {
  let spanContext = A.trace.getSpanContext(eventContext ?? A.context.active()),
    c = spanContext !== void 0 && A.isSpanContextValid(spanContext);
  return {
    to: "collector",
    event: event,
    attributes: Do(attributes, isPrimitiveAttribute),
    loggedAt: loggedAt.toISOString(),
    ...(c && {
      span: { traceId: spanContext.traceId, spanId: spanContext.spanId, traceFlags: spanContext.traceFlags },
    }),
  };
}
//@ chunk-p52gp8zk.js:7316-7663 placement
function sendEventRecord(e, { entry: entry, signal: signal, hookOrigin: hookOrigin }) {
  let s = () =>
      logForDebugging(
        `[3P telemetry] Event record dropped (${entry.event}): still on the collector road when a flush stopped waiting`,
      ),
    c = (u) =>
      logForDebugging(
        `[3P telemetry] Event record lost (${entry.event}): its raise failed: ${errorMessage(u)}`,
        { level: "warn" },
      );
  return signal.aborted
    ? s()
    : e.send(entry, signal, hookOrigin).then(
        () => {
          return;
        },
        (u) => (signal.aborted ? s() : c(u)),
      );
}
/**
 * 创建第三方遥测事件记录的发送队列：顺序发送、可中止、限制积压。
 */
//@ chunk-p52gp8zk.js:7663-8568 placement
function createEventRecordQueue() {
  let e = pu(),
    withResolvers = Promise.withResolvers(),
    o = null,
    abortController = new AbortController(),
    s = 0;
  async function c() {
    while (o !== null) await o;
  }
  function u() {
    if (o === null) return;
    (logForDebugging(
      "[3P telemetry] A flush stopped waiting for the collector road; records still on it are dropped",
    ),
      abortController.abort(),
      (abortController = new AbortController()),
      (o = null));
  }
  return {
    setRoad: (f) => {
      if ((e.set(f), f === null)) withResolvers = Promise.withResolvers();
      else ((s = 0), withResolvers.resolve(f));
    },
    getRoad: e.get,
    route: (f, a) => {
      let y = e.get() === null;
      if (y && s >= sLi)
        return (
          logForDebugging(
            "[3P telemetry] Event record dropped: no road installed and too many already waiting for one",
            { level: "warn" },
          ),
          Promise.resolve()
        );
      s += y ? 1 : 0;
      let m = { entry: f(), signal: abortController.signal, hookOrigin: a },
        E = (o ?? Promise.resolve())
          .then(() => e.get() ?? withResolvers.promise)
          .then((g) => sendEventRecord(g, m))
          .catch((g) =>
            logForDebugging(`[3P telemetry] Event record dropped: ${errorMessage(g)}`, { level: "warn" }),
          );
      return (
        (o = E),
        E.then(() => {
          if (o === E) o = null;
        }),
        E
      );
    },
    isIdle: () => o === null,
    settled: c,
    settledWithin: (f) => withDeadline(c(), f).then(u),
  };
}
//@ chunk-p52gp8zk.js:8568-8581 placement
var eventRecordQueue = createEventRecordQueue();
//@ chunk-p52gp8zk.js:8618-8638 placement
var EVENT_RECORD_LIMITS = 8388608,
  j = 24;
//@ chunk-p52gp8zk.js:8638-8740 placement
class ContentLoggingState {
  shown = new Set();
  toolTexts = new Set();
  shownChars = 0;
  toolTextChars = 0;
  dropped = !1;
  genuine = !1;
  version = 0;
}
//@ chunk-p52gp8zk.js:8740-8764 placement
var S = new HostScoped(() => new ContentLoggingState());
//@ chunk-p52gp8zk.js:8764-8819 placement
function markRecordDropped(e) {
  let of = S.of(e);
  ((of.dropped = !0), of.version++);
}
//@ chunk-p52gp8zk.js:8819-8854 placement
function markRecordGenuine(e) {
  S.of(e).genuine = !0;
}
//@ chunk-p52gp8zk.js:8854-8987 placement
function noteShownText(e, n) {
  let of = S.of(e);
  if (n.trim() === "" || !touchSetEntry(of.shown, n)) return;
  ((of.shownChars = evictOldestIfAtCap(of, of.shown, of.shownChars + n.length)), of.version++);
}
//@ chunk-p52gp8zk.js:8987-9134 placement
function noteToolText(e, n) {
  let of = S.of(e);
  if (n.trim() === "" || !touchSetEntry(of.toolTexts, n)) return;
  ((of.toolTextChars = evictOldestIfAtCap(of, of.toolTexts, of.toolTextChars + n.length)), of.version++);
}
//@ chunk-p52gp8zk.js:9134-9251 placement
function hasRecordedText(e) {
  if (e === void 0) return !0;
  let of = S.of(e);
  return of.shown.size > 0 || of.toolTexts.size > 0 || of.genuine || of.dropped;
}
//@ chunk-p52gp8zk.js:9251-9282 placement
function recordStateOf(e) {
  return S.of(e);
}
//@ chunk-p52gp8zk.js:16085-16202 placement
function otelLogRecord(e, n, o, r) {
  return {
    timestamp: o,
    observedTimestamp: o,
    body: `claude_code.${e}`,
    attributes: n,
    ...(r && { context: r }),
  };
}
//@ chunk-p52gp8zk.js:16202-16475 placement
function emitOrBufferOtelEvent(e, n) {
  let o = getEventLogger();
  if (o) {
    o.emit(e);
    return;
  }
  let of = otelEventStateByHost.of(getRootSession().host);
  if (!bufferPendingOTelEvent(e) && !of.warnedNoEventLogger)
    ((of.warnedNoEventLogger = !0),
      logForDebugging(`[3P telemetry] Event dropped (no event logger initialized): ${n}`, {
        level: isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ? "warn" : "debug",
      }));
}
//@ chunk-p52gp8zk.js:16475-16615 placement
function logPermissionModeChanged(e, n) {
  if (e.from === e.to) return;
  logOTelEvent(
    "permission_mode_changed",
    { from_mode: e.from, to_mode: e.to, ...(e.trigger && { trigger: e.trigger }) },
    n,
  );
}
//@ chunk-p52gp8zk.js:16615-16949 placement
function logCompactionEvent(e, n) {
  logOTelEvent(
    "compaction",
    {
      trigger: e.trigger,
      success: String(e.success),
      duration_ms: String(Math.round(e.durationMs)),
      ...(e.preTokens !== void 0 && { pre_tokens: String(e.preTokens) }),
      ...(e.postTokens !== void 0 && { post_tokens: String(e.postTokens) }),
      ...(e.error && { error: e.error }),
      ...(e.precomputeReuse && { precompute_reuse: e.precomputeReuse }),
    },
    n,
  );
}
//@ chunk-p52gp8zk.js:16949-17796 placement
function logRetentionSweep(e) {
  logOTelEvent("retention_sweep", {
    result: e.result,
    period_days: String(e.periodDays),
    used_default: String(e.usedDefault),
    ...(e.skipReason && { skip_reason: e.skipReason }),
    ...(e.transcriptsDeleted !== void 0 && { transcripts_deleted: String(e.transcriptsDeleted) }),
    ...(e.transcriptsExemptedDesktop !== void 0 && {
      transcripts_exempted_desktop: String(e.transcriptsExemptedDesktop),
    }),
    ...(e.sessionFilesDeleted !== void 0 && { session_files_deleted: String(e.sessionFilesDeleted) }),
    ...(e.artifactsDeleted !== void 0 && { artifacts_deleted: String(e.artifactsDeleted) }),
    ...(e.filesRetainedFresh !== void 0 && { files_retained_fresh: String(e.filesRetainedFresh) }),
    ...(e.filesPastCutoff !== void 0 && { files_past_cutoff: String(e.filesPastCutoff) }),
    ...(e.errorCount !== void 0 && { error_count: String(e.errorCount) }),
    ...(e.historyEntriesPruned !== void 0 && { history_entries_pruned: String(e.historyEntriesPruned) }),
  });
}
//@ chunk-p52gp8zk.js:17796-17805 placement
var G = !1;
//@ chunk-p52gp8zk.js:17805-17981 placement
function logFirstInternalError(e) {
  if (G) return;
  G = !0;
  try {
    let n = e.name !== "Error" ? e.name : e.constructor?.name || "Error";
    logOTelEvent("internal_error", {
      error_name: sanitizeClassName(n) ?? "Error",
      error_code: sanitizeErrnoForTelemetry(e),
    });
  } finally {
    G = !1;
  }
}
//@ chunk-p52gp8zk.js:17981-18069 placement
function logAtMention(e) {
  logOTelEvent("at_mention", { mention_type: e.mentionType, success: String(e.success) });
}
//@ chunk-p52gp8zk.js:18069-18288 placement
function logAuthEvent(e) {
  let n = e.error !== void 0 ? classifyAxiosError(e.error) : null;
  logOTelEvent("auth", {
    action: e.action,
    success: String(e.success),
    auth_method: e.authMethod,
    ...(n && { error_category: n.kind, ...(n.status !== void 0 && { status_code: String(n.status) }) }),
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
  j,
  noteShownText,
  hasRecordedText,
};
