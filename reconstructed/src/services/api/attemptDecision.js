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
import {
  APIConnectionError,
  APIError,
  APIUserAbortError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isStreamSuspendedError, isNetworkDownError } from "./errorUtils.js";
import { STOP_REASON_KEYS } from "../../utils/advisor.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { normalizeAgentQuerySource } from "./requestHeaders.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";

//@ chunk-e6aww6q8.js:2642526-2642579 placement
function eagerRainShadowBudget() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_rain", true) ? RETRY_POLICY_CONST_JEE : 0;
}
//@ chunk-e6aww6q8.js:2642579-2644257 placement
/**
 * 判定一次 API 尝试的结果（保留部分输出、失败、只有思考等），并与旧逻辑做影子比对。
 */
function decideAttemptOutcome(e, apiAttemptsLeft) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_attempt_decision_shadow",
    false,
  );
  let s = EMPTY_RETRY_COUNTS;
  let h = s;
  let y = STREAM_RETRY_CONST_2;
  let S = false;
  let w = false;
  let L = () => apiAttemptsLeft !== undefined && apiAttemptsLeft.count <= 0;
  function G(Se) {
    return Se === "keepPartial" || !L() ? Se : "fail";
  }
  function q(error, fallbackModelCouldHelp) {
    if (w) return;
    try {
      let we = classifyAttemptError(error, fallbackModelCouldHelp);
      if (we === undefined) return;
      let Ee = decideStreamRetry(we, s, e, true);
      s = Ee.counts;
      return {
        failure: we,
        decision: Ee.decision,
      };
    } catch (error) {
      logError(error);
      return;
    }
  }
  function Z(Se, ke) {
    if (Se === undefined || Se.decision === ke || S || !featureValue_CACHED_MAY_BE_STALE) return;
    S = true;
    logEvent("tengu_attempt_decision_mismatch", {
      end: fromEnum(Se.failure.kind),
      status: Se.failure.kind === "httpError" ? Se.failure.status : undefined,
      decided: fromEnum(Se.decision),
      did: fromEnum(ke),
      spent: s.retries,
      limit: e.maxRetries,
    });
  }
  return {
    onStreamFailed(Se, ke) {
      h = s;
      let we;
      try {
        let Ee = decideStreamRetry(Se, s, e, ke);
        s = Ee.counts;
        we = Ee.decision;
      } catch (error) {
        logError(error);
        we =
          Se.progress === "thinkingOnly" || Se.progress === "output"
            ? "keepPartial"
            : ke
              ? "retryWithoutStreaming"
              : "fail";
      }
      we = G(we);
      w = we === "fail" || we === "useFallbackModel";
      return we;
    },
    undoLastCount() {
      s = h;
      w = false;
    },
    counts: () => s,
    retriesLeft: () => Math.max(0, e.maxRetries - s.retries),
    sleptThroughLeft: () => Math.max(0, e.maxSleptThrough - s.sleptThrough),
    reconnectsLeft: () => Math.max(0, e.maxReconnects - s.reconnects),
    takeCredentialRenewal() {
      if (y <= 0) return false;
      y--;
      return true;
    },
    capacityWait: {
      spentMs: 0,
      usageLimitSpentMs: 0,
    },
    takeApiAttempt() {
      if (apiAttemptsLeft === undefined) return true;
      if (apiAttemptsLeft.count <= 0) return false;
      apiAttemptsLeft.count--;
      return true;
    },
    outOfApiAttempts: L,
    onWithRetryGaveUp(Se) {
      if (L()) return "fail";
      let ke = q(Se, false);
      let we = ke?.decision === "retryWithoutStreaming" ? "retryWithoutStreaming" : "fail";
      Z(ke, we);
      return we;
    },
    reportHttpFailure(Se, ke, we) {
      let { triedWithoutStreaming } = s;
      let Ae = q(Se, we?.fallbackModelCouldHelp ?? false);
      s = {
        ...s,
        triedWithoutStreaming,
      };
      if (Ae === undefined && ke === "retry")
        s = {
          ...s,
          retries: Math.min(s.retries + 1, e.maxRetries),
        };
      Z(Ae, ke);
    },
  };
}
//@ chunk-e6aww6q8.js:2644257-2644564 placement
/**
 * 把一次请求尝试的错误归类为无响应或 HTTP 错误（401/403 除外），标注是否挂起、断网与回退模型是否可能有用。
 */
function classifyAttemptError(error, fallbackModelCouldHelp) {
  if (error instanceof APIConnectionError)
    return {
      kind: "noResponse",
      suspended: isStreamSuspendedError(error),
      networkDown: isNetworkDownError(error),
    };
  let r =
    error instanceof APIError
      ? error
      : error instanceof Error && error.cause instanceof APIError
        ? error.cause
        : undefined;
  if (r?.status === undefined || r.status === 401 || r.status === 403) return;
  return {
    kind: "httpError",
    status: r.status,
    fallbackModelCouldHelp,
  };
}
//@ chunk-e6aww6q8.js:2644564-2645030 placement
/**
 * 判定一次流式尝试是否算失败：按进度（output/thinkingOnly/partialOutput/started/nothing）与原因分类；已完整且原因是断线/挂起/截断/卡住、或已有输出时的过载/服务端错/超时，不视为失败。
 */
function classifyStreamFailure(attempt) {
  let n = attempt.anyBlockFinished
    ? attempt.anyOutputShown
      ? "output"
      : "thinkingOnly"
    : attempt.anyOutputShown
      ? "partialOutput"
      : attempt.anyEvent
        ? "started"
        : "nothing";
  let r = streamFailureCause(attempt);
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
//@ chunk-e6aww6q8.js:2645030-2645526 placement
/**
 * 把流式请求失败归因：被拒绝、输出被过滤、过载、服务器错误或超时、停滞、截断、挂起、连接中断、格式错误、错误请求或未知。
 */
function streamFailureCause(attempt) {
  if (attempt.denied) return "denied";
  if (attempt.outputFiltered) return "outputFiltered";
  if (is529Error(attempt.error)) return "overloaded";
  if (attempt.isServerError)
    return attempt.error instanceof APIError && attempt.error.type === "timeout_error"
      ? "timedOut"
      : "serverError";
  if (attempt.stalled) return "stalled";
  if (attempt.isConnectionError) {
    if (attempt.truncated) return "truncated";
    return attempt.suspended ? "suspended" : "connectionLost";
  }
  if (attempt.malformed) return "malformed";
  return attempt.error instanceof APIError &&
    !(attempt.error instanceof APIConnectionError) &&
    !(attempt.error instanceof APIUserAbortError)
    ? "badRequest"
    : "unknown";
}
//@ chunk-e6aww6q8.js:2645526-2646270 placement
function classifyAttemptOutcome(e, n) {
  try {
    let r = e.ended ?? (n.aborted ? "aborted" : n.stopReason === "refusal" ? "completed" : "other");
    let s =
      r !== "completed" || n.stopReason === null
        ? null
        : (STOP_REASON_KEYS.find((y) => y === n.stopReason) ?? "unknown");
    let msFromRetryToEnd = Math.max(0, Math.round(n.now - e.startedAt));
    logForDiagnosticsNoPII("warn", "cli_output_filter_retry_outcome", {
      outcome: r,
      stop_reason: s,
      first_stop_progress: e.firstStopProgress,
      ms_to_first_stop: e.msToFirstStop,
      ms_from_retry_to_end: msFromRetryToEnd,
      model: telemetrySafeModelName(n.model) ?? null,
      query_source: normalizeAgentQuerySource(n.querySource) ?? null,
      client_request_id: sanitizeMarkName(n.clientRequestId) ?? null,
    });
    logEvent("tengu_output_filter_retry_outcome", {
      outcome: fromEnum(r),
      stop_reason: fromEnumOpt(s),
      first_stop_progress: fromEnum(e.firstStopProgress),
      ms_to_first_stop: e.msToFirstStop,
      ms_from_retry_to_end: msFromRetryToEnd,
      model: telemetrySafeModelName(n.model),
      query_source: agentTypeForTelemetry(n.querySource),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2646270-2646737 placement
/**
 * 构造 thinking_drop 附件：请求与模型信息、已发送的思考块与轮数、新丢弃项、块哈希、是否首次报告与客户端变化。
 */
function buildThinkingDropAttachment(
  { drops, blockHashes, sent, firstReport, change },
  { requestId, model, querySource, requestedBehavior },
) {
  return {
    type: "thinking_drop",
    requestId: requestId ?? undefined,
    model,
    querySource: agentTypeForTelemetry(querySource),
    requestedBehavior,
    thinkingBlocksSent: sent.blocksSent,
    thinkingTurnsSent: sent.turnsSent,
    newlyDropped: drops,
    blockHashes,
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
function collectDroppedThinkingHashes(messages) {
  let n = [];
  for (let r of messages) {
    if (
      r?.type !== "attachment" ||
      r.attachment?.type !== "thinking_drop" ||
      !Array.isArray(r.attachment.blockHashes)
    )
      continue;
    for (let blockHash of r.attachment.blockHashes)
      if (typeof blockHash === "string" && /^[0-9a-z]{1,13}$/.test(blockHash)) n.push(blockHash);
  }
  return n;
}
export {
  decideAttemptOutcome,
  eagerRainShadowBudget,
  collectDroppedThinkingHashes,
  buildThinkingDropAttachment,
  classifyStreamFailure,
  classifyAttemptOutcome,
};
