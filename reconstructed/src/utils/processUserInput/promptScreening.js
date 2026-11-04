/**
 * utils/processUserInput/promptScreening.ts
 *
 * 2.1.316 新增：提示词筛查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (6)
 * attribution: placement 6
 */
import {
  hasHookRegistrationChanged,
  hasPromptSubmitHooks,
} from "../plugins/functionHooks/hookRegistration.js";
import { isNullRenderingAttachment_2 } from "./processUserInput.js";
import { interruptedCommandResult } from "../../plugins/functionHooks/commandRunDispatch.js";
import { createUserInterruptionMessage } from "../messages.js";
import { unwrapAbortReason } from "../abortController.js";

//@ chunk-xx1vmpsq.js:60683-60725 placement
function keepUnlessDropped(screened, needsRescreenNow) {
  return screened.dropped !== true && needsRescreenNow;
}
//@ chunk-xx1vmpsq.js:60725-60799 placement
/**
 * needsRescreen：钩子注册变化时需要重新筛查。
 */
function needsRescreen({ since, isRunReached }) {
  return (
    hasHookRegistrationChanged(since) ||
    hasPromptSubmitHooks({
      isRunReached,
    })
  );
}
//@ chunk-xx1vmpsq.js:60799-60959 placement
/**
 * 筛查结果仍有效时结算记录并回调，返回是否结算。
 */
function settleScreening({ recording, onScreened, screened, isRunReached, since }) {
  let needsRescreenNow = needsRescreen({
    since,
    isRunReached,
  });
  if (keepUnlessDropped(screened, needsRescreenNow)) return false;
  recording?.settled(screened);
  onScreened?.(screened);
  return true;
}
//@ chunk-xx1vmpsq.js:60959-61048 placement
/**
 * withRewriteState：附加改写状态。
 */
function withRewriteState(screened, rewritten) {
  return screened.dropped === true || screened.rewritten !== undefined || rewritten === undefined
    ? screened
    : {
        rewritten,
      };
}
//@ chunk-xx1vmpsq.js:61048-61175 placement
/**
 * 结算筛查结果：结果未知时标为 noVerdict，否则结算记录并回调。
 */
function settleScreeningResult({ result, screened, isUnknown, recording, onScreened }) {
  if (keepUnlessDropped(screened, isUnknown)) {
    result.noVerdict = true;
    return;
  }
  recording?.settled(screened);
  onScreened?.(screened);
}
//@ chunk-xx1vmpsq.js:61175-61407 placement
/**
 * 输入处理被中断时的结果：附加中断标记消息（关闭时不保留消息）。
 */
function interruptedInputResult(result, context, isQueuedByPlugin) {
  let { signal } = context.abortController;
  let keptMessages = isNullRenderingAttachment_2(result.messages, context);
  let interruption = interruptedCommandResult({
    signal,
    typed: [],
    marker: createUserInterruptionMessage({
      toolUse: false,
    }),
    isQueuedByPlugin,
  });
  let byShutdown = unwrapAbortReason(signal.reason) === "shutdown";
  return {
    ...interruption,
    messages: byShutdown ? [] : [...keptMessages, ...interruption.messages],
    interrupted: true,
  };
}
export { settleScreening, withRewriteState, needsRescreen, interruptedInputResult, settleScreeningResult };
