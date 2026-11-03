/**
 * components/_new/dropRepeatedTurnDurations.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (5)
 * attribution: sole-consumer-new 5
 */
import { deriveUUID } from "../../utils/messages.js";
import { isHumanTurn_3 } from "../../utils/messagePredicates.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { RFt } from "../../utils/messages/mappers.js";

//@ chunk-ag5x7vhf.js:118205-118292 sole-consumer-new
function fw(m) {
  return m.type === "attachment" && m.attachment.type === "async_hook_response";
}
/**
 * 把连续的钩子附件合并为按事件计数的一条。
 */
//@ chunk-ag5x7vhf.js:118292-118764 sole-consumer-new
function collapseHookAttachments(m) {
  let h = [],
    x = 0;
  while (x < m.length) {
    let T = m[x];
    if (fw(T)) {
      let k = new Map(),
        _ = 0;
      while (x < m.length) {
        let I = m[x];
        if (!fw(I)) break;
        let hookEvent = I.attachment.hookEvent;
        (k.set(hookEvent, (k.get(hookEvent) ?? 0) + 1), _++, x++);
      }
      if (_ === 1) h.push(T);
      else {
        let I = [];
        for (let [A, L] of k) I.push({ hookEvent: A, count: L });
        let uuid = T.uuid;
        h.push({
          type: "attachment",
          uuid: typeof uuid === "string" && uuid !== "" ? deriveUUID(T.uuid, _) : T.uuid,
          timestamp: T.timestamp,
          attachment: { type: "async_hook_response_batch", hooks: I },
        });
      }
    } else (h.push(T), x++);
  }
  return h;
}
/**
 * 去掉后台代理/工作流计数未变的重复回合耗时行。
 */
//@ chunk-ag5x7vhf.js:118764-119283 sole-consumer-new
function dropRepeatedTurnDurations(m, h) {
  if (h) return m;
  let x = 0,
    T = 0,
    k = null;
  for (let [_, I] of m.entries()) {
    if (I.type === "system" && I.subtype === "turn_duration") {
      let D = I.pendingBackgroundAgentCount ?? 0,
        A = I.pendingWorkflowCount ?? 0,
        L =
          (D > 0 || A > 0) &&
          D === x &&
          A === T &&
          I.budgetLimit === void 0 &&
          (I.briefHiddenCount ?? 0) === 0;
      if (((x = D), (T = A), L)) {
        k ??= m.slice(0, _);
        continue;
      }
    } else if (
      I.type === "user"
        ? isHumanTurn_3(I)
        : I.type === "attachment" &&
          I.attachment.type === "queued_command" &&
          I.attachment.isMeta !== !0 &&
          isHumanOrUnset(resolveTaskNotificationOrigin(I.attachment.origin, I.attachment.commandMode))
    )
      ((x = 0), (T = 0));
    k?.push(I);
  }
  return k ?? m;
}
//@ chunk-ag5x7vhf.js:119283-119362 sole-consumer-new
function yp(m, h) {
  if (h || !m.some(isDuplicateRemoteError)) return m;
  return m.filter((x, T) => !isDuplicateRemoteError(x, T, m));
}
//@ chunk-ag5x7vhf.js:119362-119609 sole-consumer-new
function isDuplicateRemoteError(m, h, x) {
  let T = x[h - 1];
  if (
    m.type !== "system" ||
    m.subtype !== "informational" ||
    m.fromRemoteErrorResult !== !0 ||
    T?.type !== "assistant" ||
    T.message.model !== SYNTHETIC_MODEL
  )
    return !1;
  let k = T.message.content[0];
  return k?.type === "text" && RFt(k.text) === RFt(m.content);
}

export { collapseHookAttachments, yp, dropRepeatedTurnDurations };
