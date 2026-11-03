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
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import {
  pluginInputHoldSlot,
  clearHeldInputAndReason,
  releaseHeldInput,
} from "../../plugins/functionHooks/inputHold.js";
import { currentSurfaceBinding } from "../../plugins/functionHooks/surfaceBinding.js";

//@ chunk-xx1vmpsq.js:30208-30358 placement
function promptOriginKind(content) {
  if (hasSeededComment(content)) return "seeded-comment";
  return (Array.isArray(content) ? content.map(textOf) : [content]).some(
    (n) => typeof n === "string" && isTeammateMessageText(n),
  )
    ? "teammate-reply"
    : undefined;
}
//@ chunk-xx1vmpsq.js:30358-30436 placement
function textOf(e) {
  return typeof e === "object" && e !== null && "text" in e ? e.text : undefined;
}
//@ chunk-xx1vmpsq.js:30436-30498 placement
function isUserTypedPrompt(e, origin, n) {
  let y = !n && promptOriginKind(e) === undefined;
  return isHumanOrUnset(origin) && y;
}
//@ chunk-xx1vmpsq.js:30498-30826 placement
/**
 * 记录提示是否由人亲自输入（排除中继、外来与已发送过的），据此更新输入暂扣状态。
 */
var notePromptOrigin = (e) =>
  runIgnoringAbort(() => {
    let { uuid, origin, isHidden, isStopped, input } = e;
    let sentBefore = pluginInputHoldSlot.get()?.sentBefore;
    let C = uuid !== undefined && sentBefore?.has(uuid) === true;
    let I = !e.isRelayed && e.foreignWord === undefined && !C && isUserTypedPrompt(input, origin, isHidden);
    let M =
      e.ownWordUuids?.some(
        (ownWordUuid) => ownWordUuid !== undefined && sentBefore?.has(ownWordUuid) !== true,
      ) ?? I;
    let R = pluginInputHoldSlot.get()?.session.deref();
    if (R !== undefined && R === currentSurfaceBinding() && !isStopped && M) clearHeldInputAndReason();
    else if (!isStopped && M) releaseHeldInput();
  });
export { promptOriginKind, notePromptOrigin, isUserTypedPrompt };
