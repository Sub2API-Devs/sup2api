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
function Fn(e, s) {
  return e.dropped !== !0 && s;
}
//@ chunk-xx1vmpsq.js:60725-60799 placement
function ws({ since: since, isRunReached: isRunReached }) {
  return hasHookRegistrationChanged(since) || hasPromptSubmitHooks({ isRunReached: isRunReached });
}
/**
 * 筛查结果仍有效时结算记录并回调，返回是否结算。
 */
//@ chunk-xx1vmpsq.js:60799-60959 placement
function settleScreening({
  recording: recording,
  onScreened: onScreened,
  screened: screened,
  isRunReached: isRunReached,
  since: since,
}) {
  let w = ws({ since: since, isRunReached: isRunReached });
  if (Fn(screened, w)) return !1;
  return (recording?.settled(screened), onScreened?.(screened), !0);
}
//@ chunk-xx1vmpsq.js:60959-61048 placement
function us(e, s) {
  return e.dropped === !0 || e.rewritten !== void 0 || s === void 0 ? e : { rewritten: s };
}
/**
 * 结算筛查结果：结果未知时标为 noVerdict，否则结算记录并回调。
 */
//@ chunk-xx1vmpsq.js:61048-61175 placement
function settleScreeningResult({
  result: e,
  screened: screened,
  isUnknown: isUnknown,
  recording: recording,
  onScreened: onScreened,
}) {
  if (Fn(screened, isUnknown)) {
    e.noVerdict = !0;
    return;
  }
  (recording?.settled(screened), onScreened?.(screened));
}
/**
 * 输入处理被中断时的结果：附加中断标记消息（关闭时不保留消息）。
 */
//@ chunk-xx1vmpsq.js:61175-61407 placement
function interruptedInputResult(e, s, n) {
  let { signal: signal } = s.abortController,
    r = isNullRenderingAttachment_2(e.messages, s),
    w = interruptedCommandResult({
      signal: signal,
      typed: [],
      marker: createUserInterruptionMessage({ toolUse: !1 }),
      isQueuedByPlugin: n,
    }),
    T = unwrapAbortReason(signal.reason) === "shutdown";
  return { ...w, messages: T ? [] : [...r, ...w.messages], interrupted: !0 };
}

export { settleScreening, us, ws, interruptedInputResult, settleScreeningResult };
