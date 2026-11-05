/**
 * utils/processUserInput/promptOrigin.ts
 *
 * 2.1.316 新增：提示词来源判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pwdsqzsj.js (6)
 * attribution: placement 4, layout 2
 */
import { hasSeededComment } from "../../services/feedback/feedbackBundle.js";
import { isTeammateMessageText } from "../messages.js";
import { TEAMMATE_MESSAGE } from "../../constants/xml.js";
import { isHumanOrUnset } from "../messageProvenance.js";
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import {
  pluginInputHoldSlot,
  clearHeldInputAndReason,
  releaseHeldInput,
} from "../../plugins/functionHooks/inputHold.js";
import { currentSurfaceBinding } from "../../plugins/functionHooks/surfaceBinding.js";

//@ chunk-pwdsqzsj.js:30586-30736 placement
function promptOriginKind(content) {
  if (hasSeededComment(content)) return "seeded-comment";
  return (Array.isArray(content) ? content.map(textOf) : [content]).some(
    (part) => typeof part === "string" && isTeammateMessageText(part),
  )
    ? "teammate-reply"
    : undefined;
}
//@ chunk-pwdsqzsj.js:30736-30868 layout
function promptOriginOfContent(value) {
  return promptOriginKind(
    Array.isArray(value)
      ? value.map((block) =>
          typeof block === "object" && block !== null && "text" in block
            ? {
                ...block,
                text: unescapeTeammateTag(block.text),
              }
            : block,
        )
      : unescapeTeammateTag(value),
  );
}
//@ chunk-pwdsqzsj.js:30868-30946 layout
function unescapeTeammateTag(text) {
  return typeof text === "string" ? text.replaceAll(`<\\${TEAMMATE_MESSAGE}`, `<${TEAMMATE_MESSAGE}`) : text;
}
//@ chunk-pwdsqzsj.js:30946-31024 placement
function textOf(block) {
  return typeof block === "object" && block !== null && "text" in block ? block.text : undefined;
}
//@ chunk-pwdsqzsj.js:31024-31086 placement
function isUserTypedPrompt(content, origin, isHidden) {
  let isPlainText = !isHidden && promptOriginKind(content) === undefined;
  return isHumanOrUnset(origin) && isPlainText;
}
//@ chunk-pwdsqzsj.js:31086-31416 placement
/**
 * 记录提示是否由人亲自输入（排除中继、外来与已发送过的），据此更新输入暂扣状态。
 */
var notePromptOrigin = (note) =>
  runIgnoringAbort(() => {
    let { uuid, origin, isHidden, isStopped, input } = note;
    let sentBefore = pluginInputHoldSlot.get()?.sentBefore;
    let alreadySent = uuid !== undefined && sentBefore?.has(uuid) === true;
    let isUserTyped =
      !note.isRelayed &&
      note.foreignWord === undefined &&
      !alreadySent &&
      isUserTypedPrompt(input, origin, isHidden);
    let shouldRelease =
      note.ownWordUuids?.some(
        (ownWordUuid) => ownWordUuid !== undefined && sentBefore?.has(ownWordUuid) !== true,
      ) ?? isUserTyped;
    let session = pluginInputHoldSlot.get()?.session.deref();
    if (session !== undefined && session === currentSurfaceBinding() && !isStopped && shouldRelease)
      clearHeldInputAndReason();
    else if (!isStopped && shouldRelease) releaseHeldInput();
  });
export { promptOriginOfContent, promptOriginKind, isUserTypedPrompt, notePromptOrigin };
