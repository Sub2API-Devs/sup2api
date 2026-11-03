/**
 * utils/collapseTurnMessages.ts
 *
 * 2.1.316 新增：渲染前的消息整理：合并连续的钩子附件为按事件计数的批次、去掉计数未变的重复回合耗时行、去掉重复的远程错误提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (5)
 * attribution: placement 5
 */
import { deriveUUID } from "./messages.js";
import { isHumanTurn_3 } from "./messagePredicates.js";
import { isHumanOrUnset } from "./messageProvenance.js";
import { resolveTaskNotificationOrigin } from "./backgroundSessionResume.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { sanitizedMessageText } from "./messages/mappers.js";

//@ chunk-ag5x7vhf.js:118205-118292 placement
function isAsyncHookResponse(m) {
  return m.type === "attachment" && m.attachment.type === "async_hook_response";
}
//@ chunk-ag5x7vhf.js:118292-118764 placement
/**
 * 把连续的钩子附件合并为按事件计数的一条。
 */
function collapseHookAttachments(m) {
  let h = [];
  let x = 0;
  while (x < m.length) {
    let T = m[x];
    if (isAsyncHookResponse(T)) {
      let k = new Map();
      let index = 0;
      while (x < m.length) {
        let I = m[x];
        if (!isAsyncHookResponse(I)) break;
        let hookEvent = I.attachment.hookEvent;
        k.set(hookEvent, (k.get(hookEvent) ?? 0) + 1);
        index++;
        x++;
      }
      if (index === 1) h.push(T);
      else {
        let I = [];
        for (let [A, L] of k)
          I.push({
            hookEvent: A,
            count: L,
          });
        let uuid = T.uuid;
        h.push({
          type: "attachment",
          uuid: typeof uuid === "string" && uuid !== "" ? deriveUUID(T.uuid, index) : T.uuid,
          timestamp: T.timestamp,
          attachment: {
            type: "async_hook_response_batch",
            hooks: I,
          },
        });
      }
    } else {
      h.push(T);
      x++;
    }
  }
  return h;
}
//@ chunk-ag5x7vhf.js:118764-119283 placement
/**
 * 去掉后台代理/工作流计数未变的重复回合耗时行。
 */
function dropRepeatedTurnDurations(m, h) {
  if (h) return m;
  let x = 0;
  let T = 0;
  let k = null;
  for (let [_, I] of m.entries()) {
    if (I.type === "system" && I.subtype === "turn_duration") {
      let pendingBackgroundAgentCount = I.pendingBackgroundAgentCount ?? 0;
      let pendingWorkflowCount = I.pendingWorkflowCount ?? 0;
      let L =
        (pendingBackgroundAgentCount > 0 || pendingWorkflowCount > 0) &&
        pendingBackgroundAgentCount === x &&
        pendingWorkflowCount === T &&
        I.budgetLimit === undefined &&
        (I.briefHiddenCount ?? 0) === 0;
      x = pendingBackgroundAgentCount;
      T = pendingWorkflowCount;
      if (L) {
        k ??= m.slice(0, _);
        continue;
      }
    } else if (
      I.type === "user"
        ? isHumanTurn_3(I)
        : I.type === "attachment" &&
          I.attachment.type === "queued_command" &&
          I.attachment.isMeta !== true &&
          isHumanOrUnset(resolveTaskNotificationOrigin(I.attachment.origin, I.attachment.commandMode))
    ) {
      x = 0;
      T = 0;
    }
    k?.push(I);
  }
  return k ?? m;
}
//@ chunk-ag5x7vhf.js:119283-119362 placement
function dropDuplicateRemoteErrors(m, h) {
  if (h || !m.some(isDuplicateRemoteError)) return m;
  return m.filter((x, T) => !isDuplicateRemoteError(x, T, m));
}
//@ chunk-ag5x7vhf.js:119362-119609 placement
function isDuplicateRemoteError(m, h, x) {
  let T = x[h - 1];
  if (
    m.type !== "system" ||
    m.subtype !== "informational" ||
    m.fromRemoteErrorResult !== true ||
    T?.type !== "assistant" ||
    T.message.model !== SYNTHETIC_MODEL
  )
    return false;
  let k = T.message.content[0];
  return k?.type === "text" && sanitizedMessageText(k.text) === sanitizedMessageText(m.content);
}
export { collapseHookAttachments, dropDuplicateRemoteErrors, dropRepeatedTurnDurations };
