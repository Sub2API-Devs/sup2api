/**
 * utils/turnOrigin.ts
 *
 * 2.1.316 新增：回合尾部分析的实际逻辑；自压缩边界以来是否有人工回合等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (19)
 * attribution: placement 19
 */
import { logEvent } from "../services/analytics/index.js";
import {
  isHumanQueuedCommand,
  isToolResultOrCompactSummary,
  isToolResultContinuation,
  isToolResultMessage,
} from "./messageProvenance.js";
import { extractPromptText } from "./permissions/yoloClassifier.js";
import { Yno } from "./messageKinds.js";
import { SYNTHETIC_MODEL, NO_CONTENT_MESSAGE } from "../constants/messages.js";

/**
 * 来源是否为人。
 */
//@ chunk-aepeg2w5.js:600991-601031 placement
function isHumanOrigin(e) {
  return e?.kind === "human";
}
//@ chunk-aepeg2w5.js:601031-601114 placement
function Jno(e) {
  return e.ownWord === !0 || (isHumanOrigin(e.origin) && e.verifiedSlackHumanTurn !== !0);
}
/**
 * 消息是否为人输入的回合。
 */
//@ chunk-aepeg2w5.js:601114-601404 placement
function isHumanTurn(e) {
  try {
    if (e.type === "user")
      return (
        isHumanOrigin(e.origin) &&
        e.toolUseResult === void 0 &&
        e.isCompactSummary !== !0 &&
        e.verifiedSlackHumanTurn !== !0
      );
    return (
      e.type === "attachment" &&
      e.attachment.type === "queued_command" &&
      isHumanOrigin(e.attachment.origin) &&
      e.attachment.verifiedSlackHumanTurn !== !0
    );
  } catch {
    return !1;
  }
}
/**
 * 是否为非用户亲手输入（meta、交接、跳过附件等）。
 */
//@ chunk-aepeg2w5.js:601404-601537 placement
function isNonTypedInput(e) {
  return (
    e.isMeta === !0 ||
    e.textNotTyped === !0 ||
    e.handedOff === !0 ||
    e.queueSkipAttachments === !0 ||
    e.queueTranscriptOnly === !0
  );
}
/**
 * 当前回合是否严格由人发起。
 */
//@ chunk-aepeg2w5.js:601537-601629 placement
function isStrictHumanTurn(e) {
  return (
    strictHumanDeciderTurn(e) !== void 0 ||
    analyzeTurnTail(e).replacedTurnStart?.bySessionUsersOwnWords === !0
  );
}
/**
 * 若回合尾部的决定者是严格意义上的人工回合，返回该消息。
 */
//@ chunk-aepeg2w5.js:601629-601750 placement
function strictHumanDeciderTurn(e) {
  let decider = analyzeTurnTail(e).decider;
  if (decider == null || !decider.strictHuman) return;
  let r = e[decider.index];
  return r !== void 0 && isHumanTurn(r) ? r : void 0;
}
//@ chunk-aepeg2w5.js:601750-601822 placement
function A8t(e) {
  return e?.kind === "human" || e?.kind === "auto-continuation";
}
/**
 * 当前回合是否由用户驱动。
 */
//@ chunk-aepeg2w5.js:601822-601924 placement
function isUserDrivenTurn(e) {
  let { decider: decider, replacedTurnStart: replacedTurnStart } = analyzeTurnTail(e);
  return decider === null ? replacedTurnStart?.byHuman === !0 : decider.userDriven;
}
/**
 * 当前回合是否由本终端用户驱动。
 */
//@ chunk-aepeg2w5.js:601924-602251 placement
function isUserDrivenHere(e) {
  let { decider: decider, replacedTurnStart: replacedTurnStart } = analyzeTurnTail(e);
  if (decider === null) return replacedTurnStart?.byHumanHere === !0;
  if (!decider.userDriven) return !1;
  let s = e[decider.index];
  if (s === void 0) return !1;
  if (s.type === "user") return s.verifiedSlackHumanTurn !== !0;
  return (
    s.type === "attachment" &&
    s.attachment.type === "queued_command" &&
    s.attachment.verifiedSlackHumanTurn !== !0
  );
}
//@ chunk-aepeg2w5.js:602251-602313 placement
var Fm = { decider: null, referentTail: void 0, scheduledTrigger: !1 };
/**
 * 分析消息尾部决定回合发起者（失败时降级并上报）。
 */
//@ chunk-aepeg2w5.js:602313-602395 placement
function analyzeTurnTail(e) {
  try {
    return analyzeTurnTailUnsafe(e);
  } catch {
    return (Lm(), { ...Fm, scheduledTrigger: isScheduledTriggerTurn(e) });
  }
}
//@ chunk-aepeg2w5.js:602395-602463 placement
function Lm() {
  try {
    logEvent("tengu_turn_tail_analysis_degraded", {});
  } catch {}
}
/**
 * 回合是否由定时触发。
 */
//@ chunk-aepeg2w5.js:602463-602793 placement = buildTranscriptEntries (0.777)
function isScheduledTriggerTurn(messages) {
  for (let n = messages.length - 1; n >= 0; n--)
    try {
      let r = messages[n];
      if (r == null) continue;
      if (r.type === "attachment" && r.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(r.attachment.origin)) return !0;
        if (isHumanQueuedCommand(r.attachment)) return !1;
        continue;
      }
      if (r.type === "user") {
        if (isToolResultOrCompactSummary(r)) {
          if (isScheduledTriggerOrigin(r.origin)) return !0;
          continue;
        }
        return isScheduledTriggerOrigin(r.origin);
      }
    } catch {
      continue;
    }
  return !1;
}
/**
 * 从后往前找最近一条“决定性”人类回合（user 消息或人类 queued_command），返回 {decider:{index,origin,text,userDriven,strictHuman,scheduledTrigger}, referentTail: 其前一条 assistant 文本, scheduledTrigger}。
 */
//@ chunk-aepeg2w5.js:602793-603978 placement
function analyzeTurnTailUnsafe(messages) {
  let n = null,
    r = -1,
    s = !1,
    h,
    y = () => ({ ...Fm, scheduledTrigger: s || isScheduledTriggerTurn(messages) });
  for (let R = messages.length - 1; R >= 0; R--) {
    let x = messages[R];
    if (x == null) return y();
    try {
      if (x.type === "attachment" && x.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(x.attachment.origin)) s = !0;
        if (isHumanQueuedCommand(x.attachment)) {
          let origin = x.attachment.origin;
          ((n = {
            index: R,
            origin: origin,
            text: nonEmptyPromptText(extractPromptText(x.attachment.prompt)),
            userDriven: !0,
            strictHuman: isHumanOrigin(origin),
            scheduledTrigger: isScheduledTriggerOrigin(origin),
          }),
            (r = R));
          break;
        }
        continue;
      }
      if (x.type !== "user" || isToolResultOrCompactSummary(x) || isToolResultContinuation(messages, R)) {
        if (x.type === "user" && isScheduledTriggerOrigin(x.origin)) s = !0;
        if (x.type === "user" && x.isCompactSummary === !0) h ??= x;
        continue;
      }
      let origin = x.origin,
        F = x.isMeta === !0 && isHumanOrigin(origin);
      ((n = {
        index: R,
        origin: origin,
        text: nonEmptyPromptText(getUserMessageText(x)),
        userDriven: F || (x.isMeta !== !0 && A8t(origin)),
        strictHuman: F || (x.isMeta !== !0 && isHumanOrigin(origin)),
        scheduledTrigger: isScheduledTriggerOrigin(origin),
      }),
        (r = R));
      break;
    } catch {
      return (Lm(), y());
    }
  }
  if (n === null) {
    let R = h?.[Yno];
    return {
      ...Fm,
      scheduledTrigger: s,
      replacedTurnStart: R?.summaryUuid === h?.uuid ? R?.turnStart : void 0,
    };
  }
  let S = s || n.scheduledTrigger,
    w;
  try {
    for (let R = r - 1; R >= 0; R--) {
      let x = messages[R];
      if (x == null) break;
      if (x.type !== "assistant") break;
      if (x.isApiErrorMessage === !0 || x.isVirtual === !0 || x.message?.model === SYNTHETIC_MODEL) continue;
      let F = getAssistantText(x);
      if (F !== null) {
        w = F;
        break;
      }
    }
  } catch {
    (Lm(), (w = void 0));
  }
  return { decider: n, referentTail: w, scheduledTrigger: S };
}
/**
 * 自压缩边界以来是否有人工回合。
 */
//@ chunk-aepeg2w5.js:603978-604521 placement
function allUserTurnsSatisfy(messages, predicate) {
  try {
    for (let r = 0; r < messages.length; r++) {
      let s = messages[r];
      if (s == null) return !1;
      if (s.type === "system") {
        if (s.subtype === "compact_boundary" || s.subtype === "microcompact_boundary") return !1;
        continue;
      }
      if (s.type === "attachment") {
        if (
          s.attachment.type === "poll_events" ||
          s.attachment.type === "teammate_mailbox" ||
          (s.attachment.type === "queued_command" && !predicate(s.attachment.origin, s))
        )
          return !1;
        continue;
      }
      if (s.type !== "user") continue;
      if (s.isCompactSummary === !0 || s.replacesSpan === !0) return !1;
      if (isToolResultMessage(s) || isToolResultContinuation(messages, r)) continue;
      if (!predicate(s.origin, s)) return !1;
    }
    return !0;
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:604521-604607 placement
function isScheduledTriggerOrigin(origin) {
  return origin?.kind === "task-notification" && origin.subkind === "scheduled-trigger";
}
//@ chunk-aepeg2w5.js:604607-604662 placement
function nonEmptyPromptText(text) {
  let n = text?.trim();
  return n && n !== NO_CONTENT_MESSAGE ? text : null;
}
//@ chunk-aepeg2w5.js:604662-604896 placement
function getAssistantText(message) {
  let n = message.message?.content;
  if (!Array.isArray(n)) return null;
  let r = [];
  for (let h of n)
    if (typeof h === "object" && h !== null && h.type === "text" && typeof h.text === "string")
      r.push(h.text);
  let joined = r.join(`
`);
  return joined.trim() !== "" ? joined : null;
}
//@ chunk-aepeg2w5.js:604896-605151 placement
function getUserMessageText(message) {
  let n = message.message?.content;
  if (typeof n === "string") return n;
  if (!Array.isArray(n)) return null;
  let r = [];
  for (let s of n)
    if (typeof s === "object" && s !== null && s.type === "text" && typeof s.text === "string")
      r.push(s.text);
  return r.length > 0
    ? r.join(`
`)
    : null;
}

export {
  isHumanTurn,
  isHumanOrigin,
  Jno,
  allUserTurnsSatisfy,
  analyzeTurnTail,
  A8t,
  isNonTypedInput,
  isUserDrivenHere,
  isStrictHumanTurn,
  isUserDrivenTurn,
  isScheduledTriggerOrigin,
  strictHumanDeciderTurn,
};
