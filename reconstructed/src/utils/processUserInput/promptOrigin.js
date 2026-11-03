/**
 * utils/processUserInput/promptOrigin.ts
 *
 * 2.1.316 新增：提示词来源判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (4)
 * attribution: placement 4
 */
import { hasSeededComment } from "../../services/feedback/feedbackBundle.js";
import { isTeammateMessageText } from "../messages.js";
import { isHumanOrUnset } from "../messageProvenance.js";
import { Km } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { RZ, CBr, releaseHeldInput } from "../../plugins/functionHooks/inputHold.js";
import { lp } from "../../plugins/functionHooks/surfaceBinding.js";

//@ chunk-xx1vmpsq.js:30208-30358 placement
function promptOriginKind(e) {
  if (hasSeededComment(e)) return "seeded-comment";
  return (Array.isArray(e) ? e.map(textOf) : [e]).some(
    (n) => typeof n === "string" && isTeammateMessageText(n),
  )
    ? "teammate-reply"
    : void 0;
}
//@ chunk-xx1vmpsq.js:30358-30436 placement
function textOf(e) {
  return typeof e === "object" && e !== null && "text" in e ? e.text : void 0;
}
//@ chunk-xx1vmpsq.js:30436-30498 placement
function isUserTypedPrompt(e, s, n) {
  let y = !n && promptOriginKind(e) === void 0;
  return isHumanOrUnset(s) && y;
}
/**
 * 记录提示是否由人亲自输入（排除中继、外来与已发送过的），据此更新输入暂扣状态。
 */
//@ chunk-xx1vmpsq.js:30498-30826 placement
var notePromptOrigin = (e) =>
  Km(() => {
    let { uuid: uuid, origin: origin, isHidden: isHidden, isStopped: isStopped, input: input } = e,
      T = RZ.get()?.sentBefore,
      C = uuid !== void 0 && T?.has(uuid) === !0,
      I = !e.isRelayed && e.foreignWord === void 0 && !C && isUserTypedPrompt(input, origin, isHidden),
      M = e.ownWordUuids?.some((A) => A !== void 0 && T?.has(A) !== !0) ?? I,
      R = RZ.get()?.session.deref();
    if (R !== void 0 && R === lp() && !isStopped && M) CBr();
    else if (!isStopped && M) releaseHeldInput();
  });

export { promptOriginKind, notePromptOrigin, isUserTypedPrompt };
