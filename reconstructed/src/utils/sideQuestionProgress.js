/**
 * utils/sideQuestionProgress.ts
 *
 * 2.1.316 新增：旁路提问进度
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mret17z7.js (2)
 * attribution: placement 2
 */
import { Us } from "../services/projects/threadRows.js";
import { getLastCacheSafeParams } from "./forkedAgent.js";
import { createAbortController } from "./abortController.js";
import { runSideQuestion } from "./sideQuestion.js";

//@ chunk-mret17z7.js:336-463 placement
function isAwaitingReply(s, o = !0) {
  let at = s.at(-1),
    a = o && at?.type === "assistant" && at.message.stop_reason === null;
  return Us(a ? s.slice(0, -1) : [...s]);
}
/**
 * 运行旁路提问（/btw）：基于历史快照单独请求模型并报告进度。
 */
//@ chunk-mret17z7.js:463-1563 placement
async function runSideQuestionWithProgress({
  question: question,
  history: history,
  parentController: parentController,
  onProgress: onProgress,
  getLiveMessages: getLiveMessages,
  isTurnInProgress: isTurnInProgress,
  buildFallbackParams: buildFallbackParams,
}) {
  let u = isTurnInProgress?.() ?? !0,
    n = getLastCacheSafeParams(),
    c = n
      ? {
          ...n,
          toolUseContext: { ...n.toolUseContext, abortController: createAbortController() },
          ...(getLiveMessages && {
            forkContextMessages: isAwaitingReply(getLiveMessages(), u),
            advisorModel: n.toolUseContext.getAdvisorSetting(),
          }),
        }
      : buildFallbackParams
        ? await buildFallbackParams()
        : null;
  if (c === null) return { cancelled: !1, response: { response: null, synthetic: !1 } };
  onProgress({ status: "started" });
  let t = await runSideQuestion({
    question: question,
    cacheSafeParams: c,
    parentController: parentController,
    onRetry: (e) =>
      onProgress({
        status: "api_retry",
        attempt: e.retryAttempt,
        max_retries: e.maxRetries,
        retry_delay_ms: e.retryInMs,
        error_status: e.status ?? null,
      }),
    threadHistory: !1,
    turnInProgress: u,
    ...(history?.length && {
      history: history.map((e) => ({
        question: e.question,
        response: e.response,
        ...(e.fallback_notice && { fallbackNotice: e.fallback_notice }),
      })),
    }),
  });
  if (t.aborted || parentController.signal.aborted) return { cancelled: !0 };
  return {
    cancelled: !1,
    response: {
      response: t.response,
      synthetic: t.synthetic,
      ...(t.refusalFallback && {
        refusal_fallback: {
          original_model: t.refusalFallback.originalModel,
          fallback_model: t.refusalFallback.fallbackModel,
          content: t.refusalFallback.content,
        },
      }),
    },
  };
}

export { runSideQuestionWithProgress, isAwaitingReply };
