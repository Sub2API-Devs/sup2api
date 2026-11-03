/**
 * services/api/thinkingResumption.ts
 *
 * 2.1.316 新增：思考块被截断后的续接
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
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

//@ chunk-e6aww6q8.js:2531723-2531847 placement
function canResumeThinking(e) {
  try {
    return isThinkingResumptionSupported(e) && !isThinkingResumptionRefused();
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "header_gate_threw");
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:2531847-2532256 placement
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
//@ chunk-e6aww6q8.js:2532256-2532502 placement
function markAbandonedThinking(e, resolvedModel) {
  try {
    if (!isThinkingResumptionSupported(resolvedModel)) return;
    for (let r of e)
      if (r.message.content.every((s) => s.type === "thinking" || s.type === "redacted_thinking"))
        r.message.abandonedByStreamRetry = true;
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "abandon_mark_threw");
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2532502-2532677 placement
/**
 * 判断助手消息是否为可重试的 API 错误（排除 DLP 拒绝、版本过旧、安全监控拦截）。
 */
function isRetryableApiErrorMessage(e) {
  return (
    e?.type === "assistant" &&
    e.isApiErrorMessage === true &&
    e.apiErrorStatus !== undefined &&
    isNonRetryable4xx(e.apiErrorStatus) &&
    e.apiError !== DLP_REQUEST_DENIED &&
    e.apiError !== CLAUDE_CODE_VERSION_TOO_OLD &&
    e.apiError !== SAFETY_MONITOR_BLOCKED
  );
}
//@ chunk-e6aww6q8.js:2532677-2533310 placement
/**
 * 输出达到 max_output_tokens 截断思考块后，请求服务端续接，被拒时改用文字提示。
 */
function resumeTruncatedThinking(assistantMessages, { healedElsewhere, attempt }) {
  let last = assistantMessages.at(-1);
  if (last === undefined) return false;
  let h = last.isApiErrorMessage === true && !healedElsewhere && isRetryableApiErrorMessage(last);
  try {
    if (!last.isApiErrorMessage)
      logFeatureOk("query_thinking_block_resumption", {
        attempt,
      });
    else if (h) {
      logForDebugging(
        `[thinking-resumption] resume request refused (HTTP ${last.apiErrorStatus}); continuing with the text nudge`,
        {
          level: "warn",
        },
      );
      if (!(last.apiErrorStatus === 400 && isThinkingResumptionRefused()))
        logFeatureSad("query_thinking_block_resumption", `refused_${last.apiErrorStatus}`, {
          attempt,
        });
    } else if (last.apiError !== "max_output_tokens" && !healedElsewhere)
      logFeatureBad("query_thinking_block_resumption", "errored", {
        attempt,
      });
  } catch (error) {
    logFeatureSad("query_thinking_block_resumption", "settle_threw");
    logError(error);
  }
  return h;
}
//@ chunk-e6aww6q8.js:2533310-2533388 placement
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
