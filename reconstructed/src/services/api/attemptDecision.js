/**
 * services/api/attemptDecision.ts
 *
 * 2.1.316 新增：单次 API 尝试结果的判定（保留部分输出、失败、仅思考等）与影子比对
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  RETRY_POLICY_CONST_JEE,
  EMPTY_RETRY_COUNTS,
  STREAM_RETRY_CONST_2,
  decideStreamRetry,
  is529Error,
} from "./withRetry.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { ef, Ot, Lf } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isStreamSuspendedError, isNetworkDownError } from "./errorUtils.js";
import { STOP_REASON_KEYS } from "../../utils/advisor.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { normalizeAgentQuerySource } from "./requestHeaders.js";
import { ye } from "../../utils/startupMarks.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";

//@ chunk-e6aww6q8.js:2642526-2642579 placement
function Eyn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_rain", !0) ? RETRY_POLICY_CONST_JEE : 0;
}
/**
 * 判定一次 API 尝试的结果（保留部分输出、失败、只有思考等），并与旧逻辑做影子比对。
 */
//@ chunk-e6aww6q8.js:2642579-2644257 placement
function decideAttemptOutcome(e, n) {
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_attempt_decision_shadow", !1),
    s = EMPTY_RETRY_COUNTS,
    h = s,
    y = STREAM_RETRY_CONST_2,
    S = !1,
    w = !1,
    L = () => n !== void 0 && n.count <= 0;
  function G(Se) {
    return Se === "keepPartial" || !L() ? Se : "fail";
  }
  function q(Se, ke) {
    if (w) return;
    try {
      let we = classifyAttemptError(Se, ke);
      if (we === void 0) return;
      let Ee = decideStreamRetry(we, s, e, !0);
      return ((s = Ee.counts), { failure: we, decision: Ee.decision });
    } catch (error) {
      logError(error);
      return;
    }
  }
  function Z(Se, ke) {
    if (Se === void 0 || Se.decision === ke || S || !r) return;
    ((S = !0),
      logEvent("tengu_attempt_decision_mismatch", {
        end: fromEnum(Se.failure.kind),
        status: Se.failure.kind === "httpError" ? Se.failure.status : void 0,
        decided: fromEnum(Se.decision),
        did: fromEnum(ke),
        spent: s.retries,
        limit: e.maxRetries,
      }));
  }
  return {
    onStreamFailed(Se, ke) {
      h = s;
      let we;
      try {
        let Ee = decideStreamRetry(Se, s, e, ke);
        ((s = Ee.counts), (we = Ee.decision));
      } catch (error) {
        (logError(error),
          (we =
            Se.progress === "thinkingOnly" || Se.progress === "output"
              ? "keepPartial"
              : ke
                ? "retryWithoutStreaming"
                : "fail"));
      }
      return ((we = G(we)), (w = we === "fail" || we === "useFallbackModel"), we);
    },
    undoLastCount() {
      ((s = h), (w = !1));
    },
    counts: () => s,
    retriesLeft: () => Math.max(0, e.maxRetries - s.retries),
    sleptThroughLeft: () => Math.max(0, e.maxSleptThrough - s.sleptThrough),
    reconnectsLeft: () => Math.max(0, e.maxReconnects - s.reconnects),
    takeCredentialRenewal() {
      if (y <= 0) return !1;
      return (y--, !0);
    },
    capacityWait: { spentMs: 0, usageLimitSpentMs: 0 },
    takeApiAttempt() {
      if (n === void 0) return !0;
      if (n.count <= 0) return !1;
      return (n.count--, !0);
    },
    outOfApiAttempts: L,
    onWithRetryGaveUp(Se) {
      if (L()) return "fail";
      let ke = q(Se, !1),
        we = ke?.decision === "retryWithoutStreaming" ? "retryWithoutStreaming" : "fail";
      return (Z(ke, we), we);
    },
    reportHttpFailure(Se, ke, we) {
      let { triedWithoutStreaming: triedWithoutStreaming } = s,
        Ae = q(Se, we?.fallbackModelCouldHelp ?? !1);
      if (((s = { ...s, triedWithoutStreaming: triedWithoutStreaming }), Ae === void 0 && ke === "retry"))
        s = { ...s, retries: Math.min(s.retries + 1, e.maxRetries) };
      Z(Ae, ke);
    },
  };
}
/**
 * 把一次请求尝试的错误归类为无响应或 HTTP 错误（401/403 除外），标注是否挂起、断网与回退模型是否可能有用。
 */
//@ chunk-e6aww6q8.js:2644257-2644564 placement
function classifyAttemptError(error, fallbackModelCouldHelp) {
  if (error instanceof ef)
    return {
      kind: "noResponse",
      suspended: isStreamSuspendedError(error),
      networkDown: isNetworkDownError(error),
    };
  let r =
    error instanceof Ot ? error : error instanceof Error && error.cause instanceof Ot ? error.cause : void 0;
  if (r?.status === void 0 || r.status === 401 || r.status === 403) return;
  return { kind: "httpError", status: r.status, fallbackModelCouldHelp: fallbackModelCouldHelp };
}
/**
 * 判定一次流式尝试是否算失败：按进度（output/thinkingOnly/partialOutput/started/nothing）与原因分类；已完整且原因是断线/挂起/截断/卡住、或已有输出时的过载/服务端错/超时，不视为失败。
 */
//@ chunk-e6aww6q8.js:2644564-2645030 placement
function classifyStreamFailure(attempt) {
  let n = attempt.anyBlockFinished
      ? attempt.anyOutputShown
        ? "output"
        : "thinkingOnly"
      : attempt.anyOutputShown
        ? "partialOutput"
        : attempt.anyEvent
          ? "started"
          : "nothing",
    r = streamFailureCause(attempt);
  if (attempt.complete) {
    if (
      r === "connectionLost" ||
      r === "suspended" ||
      r === "truncated" ||
      r === "stalled" ||
      ((r === "overloaded" || r === "serverError" || r === "timedOut") && n === "output")
    )
      return;
  }
  return {
    kind: "streamFailed",
    cause: r,
    progress: n,
    stopReasonReceived: attempt.stopReasonReceived,
    outlastedNonStreamingTimeout: attempt.outlastedNonStreamingTimeout,
  };
}
/**
 * 把流式请求失败归因：被拒绝、输出被过滤、过载、服务器错误或超时、停滞、截断、挂起、连接中断、格式错误、错误请求或未知。
 */
//@ chunk-e6aww6q8.js:2645030-2645526 placement
function streamFailureCause(attempt) {
  if (attempt.denied) return "denied";
  if (attempt.outputFiltered) return "outputFiltered";
  if (is529Error(attempt.error)) return "overloaded";
  if (attempt.isServerError)
    return attempt.error instanceof Ot && attempt.error.type === "timeout_error" ? "timedOut" : "serverError";
  if (attempt.stalled) return "stalled";
  if (attempt.isConnectionError) {
    if (attempt.truncated) return "truncated";
    return attempt.suspended ? "suspended" : "connectionLost";
  }
  if (attempt.malformed) return "malformed";
  return attempt.error instanceof Ot && !(attempt.error instanceof ef) && !(attempt.error instanceof Lf)
    ? "badRequest"
    : "unknown";
}
//@ chunk-e6aww6q8.js:2645526-2646270 placement
function classifyAttemptOutcome(e, n) {
  try {
    let r = e.ended ?? (n.aborted ? "aborted" : n.stopReason === "refusal" ? "completed" : "other"),
      s =
        r !== "completed" || n.stopReason === null
          ? null
          : (STOP_REASON_KEYS.find((y) => y === n.stopReason) ?? "unknown"),
      max = Math.max(0, Math.round(n.now - e.startedAt));
    (logForDiagnosticsNoPII("warn", "cli_output_filter_retry_outcome", {
      outcome: r,
      stop_reason: s,
      first_stop_progress: e.firstStopProgress,
      ms_to_first_stop: e.msToFirstStop,
      ms_from_retry_to_end: max,
      model: telemetrySafeModelName(n.model) ?? null,
      query_source: normalizeAgentQuerySource(n.querySource) ?? null,
      client_request_id: ye(n.clientRequestId) ?? null,
    }),
      logEvent("tengu_output_filter_retry_outcome", {
        outcome: fromEnum(r),
        stop_reason: fromEnumOpt(s),
        first_stop_progress: fromEnum(e.firstStopProgress),
        ms_to_first_stop: e.msToFirstStop,
        ms_from_retry_to_end: max,
        model: telemetrySafeModelName(n.model),
        query_source: agentTypeForTelemetry(n.querySource),
      }));
  } catch (error) {
    logError(error);
  }
}
/**
 * 构造 thinking_drop 附件：请求与模型信息、已发送的思考块与轮数、新丢弃项、块哈希、是否首次报告与客户端变化。
 */
//@ chunk-e6aww6q8.js:2646270-2646737 placement
function buildThinkingDropAttachment(
  { drops: drops, blockHashes: blockHashes, sent: sent, firstReport: firstReport, change: change },
  { requestId: requestId, model: model, querySource: querySource, requestedBehavior: requestedBehavior },
) {
  return {
    type: "thinking_drop",
    requestId: requestId ?? void 0,
    model: model,
    querySource: agentTypeForTelemetry(querySource),
    requestedBehavior: requestedBehavior,
    thinkingBlocksSent: sent.blocksSent,
    thinkingTurnsSent: sent.turnsSent,
    newlyDropped: drops,
    blockHashes: blockHashes,
    firstReportForThreadInProcess: firstReport,
    clientChange: {
      kinds: change.kinds,
      firstChangedMessageIndex: change.firstChangedMessageIndex,
      baseline: change.baseline,
      callNumber: change.callNumber,
    },
  };
}
//@ chunk-e6aww6q8.js:2646737-2647001 placement
function collectDroppedThinkingHashes(e) {
  let n = [];
  for (let r of e) {
    if (
      r?.type !== "attachment" ||
      r.attachment?.type !== "thinking_drop" ||
      !Array.isArray(r.attachment.blockHashes)
    )
      continue;
    for (let blockHashe of r.attachment.blockHashes)
      if (typeof blockHashe === "string" && /^[0-9a-z]{1,13}$/.test(blockHashe)) n.push(blockHashe);
  }
  return n;
}

export {
  decideAttemptOutcome,
  Eyn,
  collectDroppedThinkingHashes,
  buildThinkingDropAttachment,
  classifyStreamFailure,
  classifyAttemptOutcome,
};
