/**
 * utils/processUserInput/promptScreening.ts
 *
 * 2.1.316 新增：提示词筛查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pwdsqzsj.js (6)
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

//@ chunk-pwdsqzsj.js:61842-61884 placement
function keepUnlessDropped(screened, needsRescreenNow) {
  return screened.dropped !== true && needsRescreenNow;
}
//@ chunk-pwdsqzsj.js:61884-61958 placement
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
//@ chunk-pwdsqzsj.js:61958-62118 placement
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
//@ chunk-pwdsqzsj.js:62118-62207 placement
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
//@ chunk-pwdsqzsj.js:62207-62334 placement
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
//@ chunk-pwdsqzsj.js:62334-62566 placement
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
