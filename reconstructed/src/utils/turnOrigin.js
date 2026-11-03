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
import { replacedTurnStartSymbol } from "./messageKinds.js";
import { SYNTHETIC_MODEL, NO_CONTENT_MESSAGE } from "../constants/messages.js";

//@ chunk-aepeg2w5.js:600991-601031 placement
/**
 * 来源是否为人。
 */
function isHumanOrigin(origin) {
  return origin?.kind === "human";
}
//@ chunk-aepeg2w5.js:601031-601114 placement
/**
 * 是否可视为用户自己输入的回合。
 */
function isOwnWordTurn(e) {
  return e.ownWord === true || (isHumanOrigin(e.origin) && e.verifiedSlackHumanTurn !== true);
}
//@ chunk-aepeg2w5.js:601114-601404 placement
/**
 * 消息是否为人输入的回合。
 */
function isHumanTurn(e) {
  try {
    if (e.type === "user")
      return (
        isHumanOrigin(e.origin) &&
        e.toolUseResult === undefined &&
        e.isCompactSummary !== true &&
        e.verifiedSlackHumanTurn !== true
      );
    return (
      e.type === "attachment" &&
      e.attachment.type === "queued_command" &&
      isHumanOrigin(e.attachment.origin) &&
      e.attachment.verifiedSlackHumanTurn !== true
    );
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:601404-601537 placement
/**
 * 是否为非用户亲手输入（meta、交接、跳过附件等）。
 */
function isNonTypedInput(e) {
  return (
    e.isMeta === true ||
    e.textNotTyped === true ||
    e.handedOff === true ||
    e.queueSkipAttachments === true ||
    e.queueTranscriptOnly === true
  );
}
//@ chunk-aepeg2w5.js:601537-601629 placement
/**
 * 当前回合是否严格由人发起。
 */
function isStrictHumanTurn(messages) {
  return (
    strictHumanDeciderTurn(messages) !== undefined ||
    analyzeTurnTail(messages).replacedTurnStart?.bySessionUsersOwnWords === true
  );
}
//@ chunk-aepeg2w5.js:601629-601750 placement
/**
 * 若回合尾部的决定者是严格意义上的人工回合，返回该消息。
 */
function strictHumanDeciderTurn(e) {
  let decider = analyzeTurnTail(e).decider;
  if (decider == null || !decider.strictHuman) return;
  let r = e[decider.index];
  return r !== undefined && isHumanTurn(r) ? r : undefined;
}
//@ chunk-aepeg2w5.js:601750-601822 placement
/**
 * 起点是人或自动续接的回合。
 */
function isHumanDrivenOrigin(origin) {
  return origin?.kind === "human" || origin?.kind === "auto-continuation";
}
//@ chunk-aepeg2w5.js:601822-601924 placement
/**
 * 当前回合是否由用户驱动。
 */
function isUserDrivenTurn(messages) {
  let { decider, replacedTurnStart } = analyzeTurnTail(messages);
  return decider === null ? replacedTurnStart?.byHuman === true : decider.userDriven;
}
//@ chunk-aepeg2w5.js:601924-602251 placement
/**
 * 当前回合是否由本终端用户驱动。
 */
function isUserDrivenHere(messages) {
  let { decider, replacedTurnStart } = analyzeTurnTail(messages);
  if (decider === null) return replacedTurnStart?.byHumanHere === true;
  if (!decider.userDriven) return false;
  let s = messages[decider.index];
  if (s === undefined) return false;
  if (s.type === "user") return s.verifiedSlackHumanTurn !== true;
  return (
    s.type === "attachment" &&
    s.attachment.type === "queued_command" &&
    s.attachment.verifiedSlackHumanTurn !== true
  );
}
//@ chunk-aepeg2w5.js:602251-602313 placement
var LAST_TURN_TAIL = {
  decider: null,
  referentTail: undefined,
  scheduledTrigger: false,
};
//@ chunk-aepeg2w5.js:602313-602395 placement
/**
 * 分析消息尾部决定回合发起者（失败时降级并上报）。
 */
function analyzeTurnTail(messages) {
  try {
    return analyzeTurnTailUnsafe(messages);
  } catch {
    logDegradedTurnTail();
    return {
      ...LAST_TURN_TAIL,
      scheduledTrigger: isScheduledTriggerTurn(messages),
    };
  }
}
//@ chunk-aepeg2w5.js:602395-602463 placement
function logDegradedTurnTail() {
  try {
    logEvent("tengu_turn_tail_analysis_degraded", {});
  } catch {}
}
//@ chunk-aepeg2w5.js:602463-602793 placement = buildTranscriptEntries (0.777)
/**
 * 回合是否由定时触发。
 */
function isScheduledTriggerTurn(messages) {
  for (let j = messages.length - 1; j >= 0; j--)
    try {
      let message = messages[j];
      if (message == null) continue;
      if (message.type === "attachment" && message.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(message.attachment.origin)) return true;
        if (isHumanQueuedCommand(message.attachment)) return false;
        continue;
      }
      if (message.type === "user") {
        if (isToolResultOrCompactSummary(message)) {
          if (isScheduledTriggerOrigin(message.origin)) return true;
          continue;
        }
        return isScheduledTriggerOrigin(message.origin);
      }
    } catch {
      continue;
    }
  return false;
}
//@ chunk-aepeg2w5.js:602793-603978 placement
/**
 * 从后往前找最近一条“决定性”人类回合（user 消息或人类 queued_command），返回 {decider:{index,origin,text,userDriven,strictHuman,scheduledTrigger}, referentTail: 其前一条 assistant 文本, scheduledTrigger}。
 */
function analyzeTurnTailUnsafe(messages) {
  let n = null;
  let r = -1;
  let s = false;
  let h;
  let y = () => ({
    ...LAST_TURN_TAIL,
    scheduledTrigger: s || isScheduledTriggerTurn(messages),
  });
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message == null) return y();
    try {
      if (message.type === "attachment" && message.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(message.attachment.origin)) s = true;
        if (isHumanQueuedCommand(message.attachment)) {
          let origin = message.attachment.origin;
          n = {
            index: j,
            origin,
            text: nonEmptyPromptText(extractPromptText(message.attachment.prompt)),
            userDriven: true,
            strictHuman: isHumanOrigin(origin),
            scheduledTrigger: isScheduledTriggerOrigin(origin),
          };
          r = j;
          break;
        }
        continue;
      }
      if (
        message.type !== "user" ||
        isToolResultOrCompactSummary(message) ||
        isToolResultContinuation(messages, j)
      ) {
        if (message.type === "user" && isScheduledTriggerOrigin(message.origin)) s = true;
        if (message.type === "user" && message.isCompactSummary === true) h ??= message;
        continue;
      }
      let origin = message.origin;
      let F = message.isMeta === true && isHumanOrigin(origin);
      n = {
        index: j,
        origin,
        text: nonEmptyPromptText(getUserMessageText(message)),
        userDriven: F || (message.isMeta !== true && isHumanDrivenOrigin(origin)),
        strictHuman: F || (message.isMeta !== true && isHumanOrigin(origin)),
        scheduledTrigger: isScheduledTriggerOrigin(origin),
      };
      r = j;
      break;
    } catch {
      logDegradedTurnTail();
      return y();
    }
  }
  if (n === null) {
    let R = h?.[replacedTurnStartSymbol];
    return {
      ...LAST_TURN_TAIL,
      scheduledTrigger: s,
      replacedTurnStart: R?.summaryUuid === h?.uuid ? R?.turnStart : undefined,
    };
  }
  let scheduledTrigger = s || n.scheduledTrigger;
  let w;
  try {
    for (let j = r - 1; j >= 0; j--) {
      let message = messages[j];
      if (message == null) break;
      if (message.type !== "assistant") break;
      if (
        message.isApiErrorMessage === true ||
        message.isVirtual === true ||
        message.message?.model === SYNTHETIC_MODEL
      )
        continue;
      let assistantText = getAssistantText(message);
      if (assistantText !== null) {
        w = assistantText;
        break;
      }
    }
  } catch {
    logDegradedTurnTail();
    w = undefined;
  }
  return {
    decider: n,
    referentTail: w,
    scheduledTrigger,
  };
}
//@ chunk-aepeg2w5.js:603978-604521 placement
/**
 * 自压缩边界以来是否有人工回合。
 */
function allUserTurnsSatisfy(messages, predicate) {
  try {
    for (let j = 0; j < messages.length; j++) {
      let s = messages[j];
      if (s == null) return false;
      if (s.type === "system") {
        if (s.subtype === "compact_boundary" || s.subtype === "microcompact_boundary") return false;
        continue;
      }
      if (s.type === "attachment") {
        if (
          s.attachment.type === "poll_events" ||
          s.attachment.type === "teammate_mailbox" ||
          (s.attachment.type === "queued_command" && !predicate(s.attachment.origin, s))
        )
          return false;
        continue;
      }
      if (s.type !== "user") continue;
      if (s.isCompactSummary === true || s.replacesSpan === true) return false;
      if (isToolResultMessage(s) || isToolResultContinuation(messages, j)) continue;
      if (!predicate(s.origin, s)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:604521-604607 placement
function isScheduledTriggerOrigin(origin) {
  return origin?.kind === "task-notification" && origin.subkind === "scheduled-trigger";
}
//@ chunk-aepeg2w5.js:604607-604662 placement
function nonEmptyPromptText(text) {
  let trimmed = text?.trim();
  return trimmed && trimmed !== NO_CONTENT_MESSAGE ? text : null;
}
//@ chunk-aepeg2w5.js:604662-604896 placement
function getAssistantText(message) {
  let content = message.message?.content;
  if (!Array.isArray(content)) return null;
  let r = [];
  for (let h of content)
    if (typeof h === "object" && h !== null && h.type === "text" && typeof h.text === "string")
      r.push(h.text);
  let joined = r.join(`
`);
  return joined.trim() !== "" ? joined : null;
}
//@ chunk-aepeg2w5.js:604896-605151 placement
function getUserMessageText(message) {
  let content = message.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  let r = [];
  for (let s of content)
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
  isOwnWordTurn,
  allUserTurnsSatisfy,
  analyzeTurnTail,
  isHumanDrivenOrigin,
  isNonTypedInput,
  isUserDrivenHere,
  isStrictHumanTurn,
  isUserDrivenTurn,
  isScheduledTriggerOrigin,
  strictHumanDeciderTurn,
};
