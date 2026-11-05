/**
 * services/api/thinkingResumption.ts
 *
 * 2.1.316 新增：思考块被截断后的续接
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */
import { isThinkingResumptionRefused, getSdkBetas } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_CLASSIFIER_REQUEST_CHARS } from "../../utils/messages/apiNormalization.js";
import { getContextWindow } from "../../utils/model/configs.js";
import {
  isNonRetryable4xx,
  DLP_REQUEST_DENIED,
  CLAUDE_CODE_VERSION_TOO_OLD,
  SAFETY_MONITOR_BLOCKED,
} from "./errors.js";
import { canSendFirstPartyBetas, modelSupportsISP } from "../../utils/betas.js";

//@ chunk-5xgkngpb.js:2575549-2575673 placement
function canResumeThinking(model) {
  try {
    return isThinkingResumptionSupported(model) && !isThinkingResumptionRefused();
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "header_gate_threw");
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:2575673-2576082 placement
/**
 * 判断被截断的思考是否可续写：模型支持、开关开启、响应可续写且上下文还有余量。
 */
function shouldResumeThinking(model, resumable, contextTokens) {
  try {
    if (
      !canResumeThinking(model) ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_thinking_block_resumption", false)
    )
      return false;
    logForDebugging(`[thinking-resumption] truncated response resumable=${String(resumable)}`);
    if (resumable !== true) {
      logFeatureSad("query_thinking_block_resumption", "not_resumable");
      return false;
    }
    if (
      contextTokens > 0 &&
      contextTokens + MAX_CLASSIFIER_REQUEST_CHARS >= getContextWindow(model, getSdkBetas())
    ) {
      logFeatureSad("query_thinking_block_resumption", "skipped_context_limit");
      return false;
    }
    return true;
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "gate_threw");
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:2576082-2576328 placement
function markAbandonedThinking(messages, resolvedModel) {
  try {
    if (!isThinkingResumptionSupported(resolvedModel)) return;
    for (let message of messages)
      if (
        message.message.content.every(
          (block) => block.type === "thinking" || block.type === "redacted_thinking",
        )
      )
        message.message.abandonedByStreamRetry = true;
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "abandon_mark_threw");
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:2576328-2576503 placement
/**
 * 判断助手消息是否为可重试的 API 错误（排除 DLP 拒绝、版本过旧、安全监控拦截）。
 */
function isRetryableApiErrorMessage(message) {
  return (
    message?.type === "assistant" &&
    message.isApiErrorMessage === true &&
    message.apiErrorStatus !== undefined &&
    isNonRetryable4xx(message.apiErrorStatus) &&
    message.apiError !== DLP_REQUEST_DENIED &&
    message.apiError !== CLAUDE_CODE_VERSION_TOO_OLD &&
    message.apiError !== SAFETY_MONITOR_BLOCKED
  );
}
//@ chunk-5xgkngpb.js:2576503-2577136 placement
/**
 * 输出达到 max_output_tokens 截断思考块后，请求服务端续接，被拒时改用文字提示。
 */
function resumeTruncatedThinking(assistantMessages, { healedElsewhere, attempt }) {
  let message = assistantMessages.at(-1);
  if (message === undefined) return false;
  let retryable =
    message.isApiErrorMessage === true && !healedElsewhere && isRetryableApiErrorMessage(message);
  try {
    if (!message.isApiErrorMessage)
      logFeatureOk("query_thinking_block_resumption", {
        attempt,
      });
    else if (retryable) {
      logForDebugging(
        `[thinking-resumption] resume request refused (HTTP ${message.apiErrorStatus}); continuing with the text nudge`,
        {
          level: "warn",
        },
      );
      if (!(message.apiErrorStatus === 400 && isThinkingResumptionRefused()))
        logFeatureSad("query_thinking_block_resumption", `refused_${message.apiErrorStatus}`, {
          attempt,
        });
    } else if (message.apiError !== "max_output_tokens" && !healedElsewhere)
      logFeatureBad("query_thinking_block_resumption", "errored", {
        attempt,
      });
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "settle_threw");
    logError(error);
  }
  return retryable;
}
//@ chunk-5xgkngpb.js:2577136-2577214 placement
function isThinkingResumptionSupported(model) {
  return (
    getFeatureValue_SESSION_PINNED("tengu_thinking_block_resumption", false) &&
    canSendFirstPartyBetas() &&
    modelSupportsISP(model)
  );
}
export {
  canResumeThinking,
  markAbandonedThinking,
  shouldResumeThinking,
  isRetryableApiErrorMessage,
  resumeTruncatedThinking,
};
