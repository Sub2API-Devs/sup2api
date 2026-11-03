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
import { Ugr } from "../../utils/messages/apiNormalization.js";
import { getContextWindow } from "../../utils/model/configs.js";
import { Moo, DLP_REQUEST_DENIED, CLAUDE_CODE_VERSION_TOO_OLD, SAFETY_MONITOR_BLOCKED } from "./errors.js";
import { canSendFirstPartyBetas, modelSupportsISP } from "../../utils/betas.js";

//@ chunk-e6aww6q8.js:2531723-2531847 placement
function canResumeThinking(e) {
  try {
    return mun(e) && !isThinkingResumptionRefused();
  } catch (error) {
    return (logFeatureSad("query_thinking_block_resumption", "header_gate_threw"), logError(error), !1);
  }
}
/**
 * 判断被截断的思考是否可续写：模型支持、开关开启、响应可续写且上下文还有余量。
 */
//@ chunk-e6aww6q8.js:2531847-2532256 placement
function shouldResumeThinking(model, resumable, contextTokens) {
  try {
    if (
      !canResumeThinking(model) ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_thinking_block_resumption", !1)
    )
      return !1;
    if (
      (logForDebugging(`[thinking-resumption] truncated response resumable=${String(resumable)}`),
      resumable !== !0)
    )
      return (logFeatureSad("query_thinking_block_resumption", "not_resumable"), !1);
    if (contextTokens > 0 && contextTokens + Ugr >= getContextWindow(model, getSdkBetas()))
      return (logFeatureSad("query_thinking_block_resumption", "skipped_context_limit"), !1);
    return !0;
  } catch (error) {
    return (logFeatureSad("query_thinking_block_resumption", "gate_threw"), logError(error), !1);
  }
}
//@ chunk-e6aww6q8.js:2532256-2532502 placement
function markAbandonedThinking(e, n) {
  try {
    if (!mun(n)) return;
    for (let r of e)
      if (r.message.content.every((s) => s.type === "thinking" || s.type === "redacted_thinking"))
        r.message.abandonedByStreamRetry = !0;
  } catch (error) {
    (logFeatureSad("query_thinking_block_resumption", "abandon_mark_threw"), logError(error));
  }
}
/**
 * 判断助手消息是否为可重试的 API 错误（排除 DLP 拒绝、版本过旧、安全监控拦截）。
 */
//@ chunk-e6aww6q8.js:2532502-2532677 placement
function isRetryableApiErrorMessage(e) {
  return (
    e?.type === "assistant" &&
    e.isApiErrorMessage === !0 &&
    e.apiErrorStatus !== void 0 &&
    Moo(e.apiErrorStatus) &&
    e.apiError !== DLP_REQUEST_DENIED &&
    e.apiError !== CLAUDE_CODE_VERSION_TOO_OLD &&
    e.apiError !== SAFETY_MONITOR_BLOCKED
  );
}
/**
 * 输出达到 max_output_tokens 截断思考块后，请求服务端续接，被拒时改用文字提示。
 */
//@ chunk-e6aww6q8.js:2532677-2533310 placement
function resumeTruncatedThinking(e, { healedElsewhere: healedElsewhere, attempt: attempt }) {
  let at = e.at(-1);
  if (at === void 0) return !1;
  let h = at.isApiErrorMessage === !0 && !healedElsewhere && isRetryableApiErrorMessage(at);
  try {
    if (!at.isApiErrorMessage) logFeatureOk("query_thinking_block_resumption", { attempt: attempt });
    else if (h) {
      if (
        (logForDebugging(
          `[thinking-resumption] resume request refused (HTTP ${at.apiErrorStatus}); continuing with the text nudge`,
          { level: "warn" },
        ),
        !(at.apiErrorStatus === 400 && isThinkingResumptionRefused()))
      )
        logFeatureSad("query_thinking_block_resumption", `refused_${at.apiErrorStatus}`, {
          attempt: attempt,
        });
    } else if (at.apiError !== "max_output_tokens" && !healedElsewhere)
      logFeatureBad("query_thinking_block_resumption", "errored", { attempt: attempt });
  } catch (error) {
    (logFeatureSad("query_thinking_block_resumption", "settle_threw"), logError(error));
  }
  return h;
}
//@ chunk-e6aww6q8.js:2533310-2533388 placement
function mun(e) {
  return (
    getFeatureValue_SESSION_PINNED("tengu_thinking_block_resumption", !1) &&
    canSendFirstPartyBetas() &&
    modelSupportsISP(e)
  );
}

export {
  canResumeThinking,
  markAbandonedThinking,
  shouldResumeThinking,
  isRetryableApiErrorMessage,
  resumeTruncatedThinking,
};
