/**
 * utils/sideQuestionProgress.ts
 *
 * 2.1.316 新增：旁路提问进度
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e508t3a3.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { getLastCacheSafeParams } from "./forkedAgent.js";
import { createAbortController } from "./abortController.js";
import { runSideQuestion } from "./sideQuestion.js";

//@ chunk-e508t3a3.js:336-463 placement
function isAwaitingReply(messages, includePlaceholder = true) {
  let last = messages.at(-1);
  let hasPendingAssistant =
    includePlaceholder && last?.type === "assistant" && last.message.stop_reason === null;
  return messagesSinceCompactBoundary(hasPendingAssistant ? messages.slice(0, -1) : [...messages]);
}
//@ chunk-e508t3a3.js:463-1563 placement
/**
 * 运行旁路提问（/btw）：基于历史快照单独请求模型并报告进度。
 */
async function runSideQuestionWithProgress({
  question,
  history,
  parentController,
  onProgress,
  getLiveMessages,
  isTurnInProgress,
  buildFallbackParams,
}) {
  let turnInProgress = isTurnInProgress?.() ?? true;
  let lastCacheSafeParams = getLastCacheSafeParams();
  let cacheSafeParams = lastCacheSafeParams
    ? {
        ...lastCacheSafeParams,
        toolUseContext: {
          ...lastCacheSafeParams.toolUseContext,
          abortController: createAbortController(),
        },
        ...(getLiveMessages && {
          forkContextMessages: isAwaitingReply(getLiveMessages(), turnInProgress),
          advisorModel: lastCacheSafeParams.toolUseContext.getAdvisorSetting(),
        }),
      }
    : buildFallbackParams
      ? await buildFallbackParams()
      : null;
  if (cacheSafeParams === null)
    return {
      cancelled: false,
      response: {
        response: null,
        synthetic: false,
      },
    };
  onProgress({
    status: "started",
  });
  let result = await runSideQuestion({
    question,
    cacheSafeParams,
    parentController,
    onRetry: (retryInfo) =>
      onProgress({
        status: "api_retry",
        attempt: retryInfo.retryAttempt,
        max_retries: retryInfo.maxRetries,
        retry_delay_ms: retryInfo.retryInMs,
        error_status: retryInfo.status ?? null,
      }),
    threadHistory: false,
    turnInProgress,
    ...(history?.length && {
      history: history.map((entry) => ({
        question: entry.question,
        response: entry.response,
        ...(entry.fallback_notice && {
          fallbackNotice: entry.fallback_notice,
        }),
      })),
    }),
  });
  if (result.aborted || parentController.signal.aborted)
    return {
      cancelled: true,
    };
  return {
    cancelled: false,
    response: {
      response: result.response,
      synthetic: result.synthetic,
      ...(result.refusalFallback && {
        refusal_fallback: {
          original_model: result.refusalFallback.originalModel,
          fallback_model: result.refusalFallback.fallbackModel,
          content: result.refusalFallback.content,
        },
      }),
    },
  };
}
export { runSideQuestionWithProgress, isAwaitingReply };
