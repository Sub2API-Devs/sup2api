/**
 * services/api/attemptDecision.ts
 *
 * 2.1.316 新增：单次 API 尝试结果的判定（保留部分输出、失败、仅思考等）与影子比对
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { findRouteTurnError } from "./gzipRequestBody.js";
import { STOP_REASON_KEYS } from "../../utils/advisor.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { normalizeAgentQuerySource } from "./requestHeaders.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";

//@ chunk-5xgkngpb.js:2703518-2703571 placement
function eagerRainShadowBudget() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_rain", true) ? RETRY_POLICY_CONST_JEE : 0;
}
//@ chunk-5xgkngpb.js:2703571-2705252 placement
/**
 * 判定一次 API 尝试的结果（保留部分输出、失败、只有思考等），并与旧逻辑做影子比对。
 */
function decideAttemptOutcome(retryLimits, apiAttemptsLeft) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_attempt_decision_shadow",
    false,
  );
  let retryCounts = EMPTY_RETRY_COUNTS;
  let previousCounts = retryCounts;
  let credentialRenewalsLeft = STREAM_RETRY_CONST_2;
  let hasReportedMismatch = false;
  let gaveUp = false;
  let isOutOfApiAttempts = () => apiAttemptsLeft !== undefined && apiAttemptsLeft.count <= 0;
  function clampDecision(decision) {
    return decision === "keepPartial" || !isOutOfApiAttempts() ? decision : "fail";
  }
  function shadowDecide(error, fallbackModelCouldHelp) {
    if (gaveUp) return;
    try {
      let failure = classifyAttemptError(error, fallbackModelCouldHelp);
      if (failure === undefined) return;
      let retryResult = decideStreamRetry(failure, retryCounts, retryLimits, true);
      retryCounts = retryResult.counts;
      return {
        failure,
        decision: retryResult.decision,
      };
    } catch (error) {
      logError(error);
      return;
    }
  }
  function reportDecisionMismatch(shadowResult, decided) {
    if (
      shadowResult === undefined ||
      shadowResult.decision === decided ||
      hasReportedMismatch ||
      !featureValue_CACHED_MAY_BE_STALE
    )
      return;
    hasReportedMismatch = true;
    logEvent("tengu_attempt_decision_mismatch", {
      end: fromEnum(shadowResult.failure.kind),
      status: shadowResult.failure.kind === "httpError" ? shadowResult.failure.status : undefined,
      decided: fromEnum(shadowResult.decision),
      did: fromEnum(decided),
      spent: retryCounts.retries,
      limit: retryLimits.maxRetries,
    });
  }
  return {
    onStreamFailed(attempt, fallbackModelCouldHelp) {
      previousCounts = retryCounts;
      let decision;
      try {
        let retryResult = decideStreamRetry(attempt, retryCounts, retryLimits, fallbackModelCouldHelp);
        retryCounts = retryResult.counts;
        decision = retryResult.decision;
      } catch (error) {
        logError(error);
        decision =
          attempt.progress === "thinkingOnly" || attempt.progress === "output"
            ? "keepPartial"
            : fallbackModelCouldHelp
              ? "retryWithoutStreaming"
              : "fail";
      }
      decision = clampDecision(decision);
      gaveUp = decision === "fail" || decision === "useFallbackModel";
      return decision;
    },
    undoLastCount() {
      retryCounts = previousCounts;
      gaveUp = false;
    },
    counts: () => retryCounts,
    retriesLeft: () => Math.max(0, retryLimits.maxRetries - retryCounts.retries),
    sleptThroughLeft: () => Math.max(0, retryLimits.maxSleptThrough - retryCounts.sleptThrough),
    reconnectsLeft: () => Math.max(0, retryLimits.maxReconnects - retryCounts.reconnects),
    takeCredentialRenewal() {
      if (credentialRenewalsLeft <= 0) return false;
      credentialRenewalsLeft--;
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
    outOfApiAttempts: isOutOfApiAttempts,
    onWithRetryGaveUp(error) {
      if (isOutOfApiAttempts()) return "fail";
      let shadowResult = shadowDecide(error, false);
      let decision = shadowResult?.decision === "retryWithoutStreaming" ? "retryWithoutStreaming" : "fail";
      reportDecisionMismatch(shadowResult, decision);
      return decision;
    },
    reportHttpFailure(error, decision, context) {
      let { triedWithoutStreaming } = retryCounts;
      let shadowResult = shadowDecide(error, context?.fallbackModelCouldHelp ?? false);
      retryCounts = {
        ...retryCounts,
        triedWithoutStreaming,
      };
      if (shadowResult === undefined && decision === "retry")
        retryCounts = {
          ...retryCounts,
          retries: Math.min(retryCounts.retries + 1, retryLimits.maxRetries),
        };
      reportDecisionMismatch(shadowResult, decision);
    },
  };
}
//@ chunk-5xgkngpb.js:2705252-2705601 placement
/**
 * 把一次请求尝试的错误归类为无响应或 HTTP 错误（401/403 除外），标注是否挂起、断网与回退模型是否可能有用。
 */
function classifyAttemptError(error, fallbackModelCouldHelp) {
  if (error instanceof APIConnectionError)
    return {
      kind: "noResponse",
      suspended: isStreamSuspendedError(error),
      networkDown: isNetworkDownError(error),
      turnedAwayOverloaded: findRouteTurnError(error)?.status === 529,
    };
  let apiError =
    error instanceof APIError
      ? error
      : error instanceof Error && error.cause instanceof APIError
        ? error.cause
        : undefined;
  if (apiError?.status === undefined || apiError.status === 401 || apiError.status === 403) return;
  return {
    kind: "httpError",
    status: apiError.status,
    fallbackModelCouldHelp,
  };
}
//@ chunk-5xgkngpb.js:2705601-2706067 placement
/**
 * 判定一次流式尝试是否算失败：按进度（output/thinkingOnly/partialOutput/started/nothing）与原因分类；已完整且原因是断线/挂起/截断/卡住、或已有输出时的过载/服务端错/超时，不视为失败。
 */
function classifyStreamFailure(attempt) {
  let progress = attempt.anyBlockFinished
    ? attempt.anyOutputShown
      ? "output"
      : "thinkingOnly"
    : attempt.anyOutputShown
      ? "partialOutput"
      : attempt.anyEvent
        ? "started"
        : "nothing";
  let cause = streamFailureCause(attempt);
  if (attempt.complete) {
    if (
      cause === "connectionLost" ||
      cause === "suspended" ||
      cause === "truncated" ||
      cause === "stalled" ||
      ((cause === "overloaded" || cause === "serverError" || cause === "timedOut") && progress === "output")
    )
      return;
  }
  return {
    kind: "streamFailed",
    cause,
    progress,
    stopReasonReceived: attempt.stopReasonReceived,
    outlastedNonStreamingTimeout: attempt.outlastedNonStreamingTimeout,
  };
}
//@ chunk-5xgkngpb.js:2706067-2706563 placement
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
//@ chunk-5xgkngpb.js:2706563-2707307 placement
function classifyAttemptOutcome(attempt, context) {
  try {
    let outcome =
      attempt.ended ??
      (context.aborted ? "aborted" : context.stopReason === "refusal" ? "completed" : "other");
    let stopReasonKey =
      outcome !== "completed" || context.stopReason === null
        ? null
        : (STOP_REASON_KEYS.find((stopReasonKey) => stopReasonKey === context.stopReason) ?? "unknown");
    let msFromRetryToEnd = Math.max(0, Math.round(context.now - attempt.startedAt));
    logForDiagnosticsNoPII("warn", "cli_output_filter_retry_outcome", {
      outcome,
      stop_reason: stopReasonKey,
      first_stop_progress: attempt.firstStopProgress,
      ms_to_first_stop: attempt.msToFirstStop,
      ms_from_retry_to_end: msFromRetryToEnd,
      model: telemetrySafeModelName(context.model) ?? null,
      query_source: normalizeAgentQuerySource(context.querySource) ?? null,
      client_request_id: sanitizeMarkName(context.clientRequestId) ?? null,
    });
    logEvent("tengu_output_filter_retry_outcome", {
      outcome: fromEnum(outcome),
      stop_reason: fromEnumOpt(stopReasonKey),
      first_stop_progress: fromEnum(attempt.firstStopProgress),
      ms_to_first_stop: attempt.msToFirstStop,
      ms_from_retry_to_end: msFromRetryToEnd,
      model: telemetrySafeModelName(context.model),
      query_source: agentTypeForTelemetry(context.querySource),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:2707307-2707774 placement
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
//@ chunk-5xgkngpb.js:2707774-2708038 placement
function collectDroppedThinkingHashes(messages) {
  let hashes = [];
  for (let message of messages) {
    if (
      message?.type !== "attachment" ||
      message.attachment?.type !== "thinking_drop" ||
      !Array.isArray(message.attachment.blockHashes)
    )
      continue;
    for (let blockHash of message.attachment.blockHashes)
      if (typeof blockHash === "string" && /^[0-9a-z]{1,13}$/.test(blockHash)) hashes.push(blockHash);
  }
  return hashes;
}
export {
  decideAttemptOutcome,
  eagerRainShadowBudget,
  collectDroppedThinkingHashes,
  buildThinkingDropAttachment,
  classifyStreamFailure,
  classifyAttemptOutcome,
};
